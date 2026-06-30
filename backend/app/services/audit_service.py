from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.action_log import ActionLog
from app.models.ai_analysis import AIAnalysis
from app.models.audit_report import AuditEvent, AuditEvidence, AuditReport
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.market_event import MarketEvent
from app.models.paper_order import PaperExecutionLog, PaperOrder
from app.models.risk_check import RiskCheck
from app.schemas.audit_report import AuditReportCreateRequest
from app.services.workflow_service import log_action, new_workflow_id


class AuditService:
    def create_report(self, db: Session, request: AuditReportCreateRequest) -> dict:
        hypothesis = db.get(Hypothesis, request.hypothesis_id)
        if hypothesis is None:
            raise _api_error(404, "HYPOTHESIS_NOT_FOUND", "Hypothesis not found.", {"hypothesis_id": request.hypothesis_id})
        paper_order = db.get(PaperOrder, request.paper_order_id) if request.paper_order_id else None
        return self._create_report_from_context(db, hypothesis=hypothesis, paper_order=paper_order, request=request)

    def create_report_from_paper_order(self, db: Session, paper_order_id: str) -> dict:
        paper_order = db.get(PaperOrder, paper_order_id)
        if paper_order is None:
            raise _api_error(404, "PAPER_ORDER_NOT_FOUND", "Paper order not found.", {"paper_order_id": paper_order_id})
        hypothesis = db.get(Hypothesis, paper_order.hypothesis_id)
        if hypothesis is None:
            raise _api_error(
                409,
                "WORKFLOW_LINK_MISSING",
                "Paper order cannot be audited because its hypothesis link is missing.",
                {"paper_order_id": paper_order_id, "hypothesis_id": paper_order.hypothesis_id},
            )
        request = AuditReportCreateRequest(
            hypothesis_id=hypothesis.id,
            backtest_id=paper_order.backtest_id,
            risk_check_id=paper_order.risk_check_id,
            paper_order_id=paper_order.id,
        )
        return self._create_report_from_context(db, hypothesis=hypothesis, paper_order=paper_order, request=request)

    def _create_report_from_context(
        self,
        db: Session,
        *,
        hypothesis: Hypothesis,
        paper_order: PaperOrder | None,
        request: AuditReportCreateRequest,
    ) -> dict:
        workflow_id = hypothesis.workflow_id or paper_order.workflow_id if paper_order else hypothesis.workflow_id or new_workflow_id()
        symbol = paper_order.symbol if paper_order else hypothesis.symbol
        ai_analysis = db.get(AIAnalysis, hypothesis.ai_analysis_id) if hypothesis.ai_analysis_id else None
        market_event = db.get(MarketEvent, hypothesis.market_event_id) if hypothesis.market_event_id else _latest_for_workflow(db, MarketEvent, workflow_id)
        backtest = db.get(BacktestResult, request.backtest_id) if request.backtest_id else _latest_for_workflow(db, BacktestResult, workflow_id)
        risk_check = db.get(RiskCheck, request.risk_check_id) if request.risk_check_id else _latest_for_workflow(db, RiskCheck, workflow_id)
        if paper_order is None:
            paper_order = db.get(PaperOrder, request.paper_order_id) if request.paper_order_id else _latest_for_workflow(db, PaperOrder, workflow_id)
        action_logs = _action_logs(db, workflow_id)
        paper_logs = _paper_logs(db, paper_order, hypothesis)
        final_decision = _final_decision(risk_check, paper_order)
        risk_level = risk_check.risk_level if risk_check else "unknown"
        event_type = market_event.event_type if market_event else "unknown"
        result = _result(backtest, risk_check, paper_order)
        outcome = _outcome(risk_check, paper_order)
        source = _first_source(market_event, ai_analysis, backtest, risk_check, paper_order)
        is_mock = any(bool(getattr(item, "is_mock", False)) for item in [market_event, ai_analysis, backtest, risk_check, paper_order] if item)

        market_context = {
            "workflow_id": workflow_id,
            "market_event": _market_event_json(market_event),
            "ai_analysis": _ai_analysis_json(ai_analysis),
            "action_logs": [_action_log_json(item) for item in action_logs],
            "paper_execution_logs": [_paper_log_json(item) for item in paper_logs],
            "source": source,
            "is_mock": is_mock,
        }
        report_id = prefixed_id("audit")
        event_dicts = _build_events(report_id, workflow_id, market_event, hypothesis, backtest, risk_check, paper_order)
        evidence_dicts = _build_evidence(report_id, workflow_id, market_event, ai_analysis, hypothesis, backtest, risk_check, paper_order, action_logs, paper_logs)
        report_json = {
            "id": report_id,
            "workflow_id": workflow_id,
            "symbol": symbol,
            "event_type": event_type,
            "status": "completed",
            "decision": final_decision,
            "risk_level": risk_level,
            "result": result,
            "outcome": outcome,
            "summary": _summary(symbol, hypothesis, backtest, risk_check, paper_order),
            "links": {
                "market_event_id": market_event.id if market_event else None,
                "hypothesis_id": hypothesis.id,
                "backtest_id": backtest.id if backtest else None,
                "risk_check_id": risk_check.id if risk_check else None,
                "paper_order_id": paper_order.id if paper_order else None,
            },
            "market_context": market_context,
            "hypothesis": _hypothesis_json(hypothesis),
            "backtest_result": _backtest_json(backtest),
            "risk_result": _risk_json(risk_check),
            "paper_execution": _paper_order_json(paper_order),
            "events": event_dicts,
            "evidence": evidence_dicts,
            "lessons": _lessons(backtest, risk_check, paper_order),
        }
        audit_hash = _hash_report(report_json)
        report = AuditReport(
            id=report_id,
            workflow_id=workflow_id,
            title=f"{symbol} decision workflow audit",
            symbol=symbol,
            event_type=event_type,
            market_event_id=market_event.id if market_event else None,
            hypothesis_id=hypothesis.id,
            backtest_id=backtest.id if backtest else request.backtest_id,
            risk_check_id=risk_check.id if risk_check else request.risk_check_id,
            paper_order_id=paper_order.id if paper_order else request.paper_order_id,
            summary=report_json["summary"],
            decision=final_decision,
            risk_level=risk_level,
            result=result,
            outcome=outcome,
            audit_hash=audit_hash,
            report_json=report_json,
            market_context_json=market_context,
            hypothesis_json=report_json["hypothesis"],
            backtest_json=report_json["backtest_result"],
            risk_json=report_json["risk_result"],
            paper_execution_json=report_json["paper_execution"],
            final_decision=final_decision,
            lessons_json=report_json["lessons"],
            source=source,
            status="completed",
            is_mock=is_mock,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(report)
        db.flush()
        for event in event_dicts:
            db.add(
                AuditEvent(
                    id=event["id"],
                    audit_report_id=report_id,
                    workflow_id=workflow_id,
                    step_index=event["step_index"],
                    step_key=event["step_key"],
                    title=event["title"],
                    status=event["status"],
                    actor=event["actor"],
                    entity_type=event["entity_type"],
                    entity_id=event["entity_id"],
                    summary=event["summary"],
                    details_json=event["details"],
                    created_at=now_utc(),
                )
            )
        for evidence in evidence_dicts:
            db.add(
                AuditEvidence(
                    id=evidence["id"],
                    audit_report_id=report_id,
                    workflow_id=workflow_id,
                    evidence_type=evidence["evidence_type"],
                    entity_type=evidence["entity_type"],
                    entity_id=evidence["entity_id"],
                    title=evidence["title"],
                    summary=evidence["summary"],
                    payload_json=evidence["payload"],
                    created_at=now_utc(),
                )
            )
        log_action(
            db,
            action_type="GENERATE_AUDIT_REPORT",
            entity_type="audit_report",
            entity_id=report.id,
            workflow_id=workflow_id,
            message="Stored tamper-evident local audit report with linked market, AI, backtest, risk, paper order, evidence, and log context.",
            payload={"final_decision": final_decision, "audit_hash": audit_hash, "paper_order_id": report.paper_order_id},
            source=report.source,
            status="completed",
            is_mock=report.is_mock,
        )
        db.commit()
        db.refresh(report)
        return self.to_schema(db, report)

    def get_report(self, db: Session, report_id: str) -> dict | None:
        report = db.scalar(select(AuditReport).where(AuditReport.id == report_id))
        return self.to_schema(db, report) if report else None

    def list_reports(self, db: Session, limit: int = 50) -> list[dict]:
        stmt = select(AuditReport).order_by(AuditReport.created_at.desc()).limit(limit)
        return [self.to_list_schema(report) for report in db.scalars(stmt)]

    def get_summary(self, db: Session, report_id: str) -> dict | None:
        report = db.scalar(select(AuditReport).where(AuditReport.id == report_id))
        if report is None:
            return None
        return {
            "id": report.id,
            "workflow_id": report.workflow_id,
            "symbol": report.symbol,
            "status": report.status,
            "time": report.created_at.isoformat(),
            "asset": report.symbol,
            "event_type": report.event_type,
            "decision": report.decision,
            "risk_level": report.risk_level,
            "result": report.result,
            "outcome": report.outcome,
            "audit_hash": report.audit_hash,
            "summary": report.summary,
            "copy_text": _copy_summary(report),
        }

    def list_evidence(self, db: Session, report_id: str) -> list[dict] | None:
        if db.get(AuditReport, report_id) is None:
            return None
        return [_evidence_schema(evidence) for evidence in _evidence_rows(db, report_id)]

    def export_json(self, db: Session, report_id: str) -> dict | None:
        report = db.scalar(select(AuditReport).where(AuditReport.id == report_id))
        if report is None:
            return None
        data = self.to_schema(db, report)
        data["audit_hash_method"] = "sha256(report_json)"
        data["audit_hash_label"] = "Local tamper-evident audit hash"
        return {
            "filename": f"{report.id}.json",
            "content_type": "application/json",
            "content": data,
        }

    def export_markdown(self, db: Session, report_id: str) -> dict | None:
        report = db.scalar(select(AuditReport).where(AuditReport.id == report_id))
        if report is None:
            return None
        summary = self.get_summary(db, report_id)
        events = [_event_schema(event) for event in _event_rows(db, report_id)]
        lines = [
            f"# Audit Report {report.id}",
            "",
            f"- Symbol: {report.symbol}",
            f"- Event type: {report.event_type}",
            f"- Status: {report.status}",
            f"- Decision: {report.decision}",
            f"- Risk level: {report.risk_level}",
            f"- Result: {report.result}",
            f"- Outcome: {report.outcome}",
            f"- Local tamper-evident audit hash: {report.audit_hash}",
            "- Hash method: sha256(report_json)",
            "",
            "## Summary",
            summary["summary"] if summary else report.summary,
            "",
            "## Workflow Evidence Chain",
        ]
        for event in events:
            lines.extend(
                [
                    "",
                    f"### {event['step_index']}. {event['title']}",
                    f"- Status: {event['status']}",
                    f"- Entity: {event['entity_type']} {event['entity_id'] or 'missing'}",
                    f"- Summary: {event['summary']}",
                ]
            )
        return {
            "filename": f"{report.id}.md",
            "content_type": "text/markdown",
            "content": "\n".join(lines) + "\n",
        }

    @staticmethod
    def to_list_schema(report: AuditReport) -> dict:
        return {
            "id": report.id,
            "workflow_id": report.workflow_id,
            "symbol": report.symbol,
            "event_type": report.event_type,
            "status": report.status,
            "risk_level": report.risk_level,
            "created_at": report.created_at,
            "audit_hash": report.audit_hash,
            "decision": report.decision,
            "result": report.result,
            "outcome": report.outcome,
        }

    @staticmethod
    def to_schema(db: Session, report: AuditReport) -> dict:
        return {
            "id": report.id,
            "workflow_id": report.workflow_id,
            "title": report.title,
            "symbol": report.symbol,
            "event_type": report.event_type,
            "market_event_id": report.market_event_id,
            "hypothesis_id": report.hypothesis_id,
            "backtest_id": report.backtest_id,
            "risk_check_id": report.risk_check_id,
            "paper_order_id": report.paper_order_id,
            "summary": report.summary,
            "decision": report.decision,
            "risk_level": report.risk_level,
            "result": report.result,
            "outcome": report.outcome,
            "audit_hash": report.audit_hash,
            "report_json": report.report_json,
            "market_context": report.market_context_json,
            "hypothesis": report.hypothesis_json,
            "backtest_result": report.backtest_json,
            "risk_result": report.risk_json,
            "paper_execution": report.paper_execution_json,
            "final_decision": report.final_decision,
            "lessons": report.lessons_json,
            "events": [_event_schema(event) for event in _event_rows(db, report.id)],
            "evidence": [_evidence_schema(evidence) for evidence in _evidence_rows(db, report.id)],
            "created_at": report.created_at,
            "is_mock": report.is_mock,
            "source": report.source,
            "status": report.status,
        }


def _api_error(status_code: int, code: str, message: str, details: dict[str, Any]) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"ok": False, "error": {"code": code, "message": message, "details": details}})


def _latest_for_workflow(db: Session, model, workflow_id: str):
    return db.scalar(select(model).where(model.workflow_id == workflow_id).order_by(model.created_at.desc()).limit(1))


def _action_logs(db: Session, workflow_id: str) -> list[ActionLog]:
    return list(db.scalars(select(ActionLog).where(ActionLog.workflow_id == workflow_id).order_by(ActionLog.created_at.asc())))


def _paper_logs(db: Session, paper_order: PaperOrder | None, hypothesis: Hypothesis | None) -> list[PaperExecutionLog]:
    if paper_order:
        return list(db.scalars(select(PaperExecutionLog).where(PaperExecutionLog.paper_order_id == paper_order.id).order_by(PaperExecutionLog.created_at.asc())))
    if hypothesis:
        return list(db.scalars(select(PaperExecutionLog).where(PaperExecutionLog.hypothesis_id == hypothesis.id).order_by(PaperExecutionLog.created_at.asc())))
    return []


def _event_rows(db: Session, report_id: str) -> list[AuditEvent]:
    return list(db.scalars(select(AuditEvent).where(AuditEvent.audit_report_id == report_id).order_by(AuditEvent.step_index.asc())))


def _evidence_rows(db: Session, report_id: str) -> list[AuditEvidence]:
    return list(db.scalars(select(AuditEvidence).where(AuditEvidence.audit_report_id == report_id).order_by(AuditEvidence.created_at.asc())))


def _first_source(*items) -> str:
    for item in items:
        if item and getattr(item, "source", None):
            return item.source
    return "backend"


def _final_decision(risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> str:
    risk_decision = (risk_check.decision if risk_check else "").upper()
    if risk_decision in {"BLOCK", "BLOCKED", "REJECTED", "REJECT"}:
        return "BLOCK"
    if paper_order:
        return "PAPER_ORDER_RECORDED"
    if risk_decision in {"WARNING", "CONDITIONAL"}:
        return "WARNING_AWAITING_PAPER_EXECUTION"
    if risk_decision in {"PASS", "APPROVED", "ALLOW"}:
        return "PASS_AWAITING_PAPER_EXECUTION"
    return "INCOMPLETE"


def _result(backtest: BacktestResult | None, risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> str:
    if paper_order:
        return paper_order.status
    if risk_check:
        return risk_check.decision
    if backtest:
        return backtest.status
    return "pending"


def _outcome(risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> str:
    if paper_order:
        mode = paper_order.execution_mode or paper_order.mode or "paper"
        return f"{paper_order.status} {mode} simulation; no real capital used."
    if risk_check and risk_check.decision.upper() in {"BLOCK", "BLOCKED", "REJECTED", "REJECT"}:
        return "Risk firewall prevented execution."
    if risk_check:
        return "Risk firewall completed; paper execution not yet recorded."
    return "Evidence chain is incomplete."


def _summary(symbol: str, hypothesis: Hypothesis | None, backtest: BacktestResult | None, risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> str:
    parts = [f"{symbol} workflow {hypothesis.workflow_id if hypothesis else 'unlinked'}"]
    if hypothesis:
        parts.append(f"hypothesis direction={hypothesis.direction}, confidence={hypothesis.confidence}")
    if backtest:
        parts.append(f"backtest PF={backtest.profit_factor:.2f}, win_rate={backtest.win_rate:.2%}")
    if risk_check:
        parts.append(f"risk={risk_check.decision}, level={risk_check.risk_level}")
    if paper_order:
        parts.append(f"paper order={paper_order.status}, real_trade={paper_order.is_real_trade}")
    return "; ".join(parts)


def _build_events(
    report_id: str,
    workflow_id: str,
    market_event: MarketEvent | None,
    hypothesis: Hypothesis,
    backtest: BacktestResult | None,
    risk_check: RiskCheck | None,
    paper_order: PaperOrder | None,
) -> list[dict]:
    return [
        _event(report_id, workflow_id, 1, "market_event", "Market Event", "Market", "market_event", market_event.id if market_event else None, market_event.status if market_event else "missing", market_event.summary if market_event else "No linked market event found.", _market_event_json(market_event)),
        _event(report_id, workflow_id, 2, "agent_hypothesis", "Agent Hypothesis", "Agent", "hypothesis", hypothesis.id, hypothesis.status, hypothesis.summary, _hypothesis_json(hypothesis)),
        _event(report_id, workflow_id, 3, "backtest_result", "Backtest Result", "Backtest", "backtest", backtest.id if backtest else None, backtest.status if backtest else "missing", _backtest_summary(backtest), _backtest_json(backtest)),
        _event(report_id, workflow_id, 4, "risk_firewall", "Risk Firewall", "Risk", "risk_check", risk_check.id if risk_check else None, risk_check.status if risk_check else "missing", _risk_summary(risk_check), _risk_json(risk_check)),
        _event(report_id, workflow_id, 5, "execution_simulation", "Execution / Simulation", "Execution", "paper_order", paper_order.id if paper_order else None, paper_order.status if paper_order else "not_created", _paper_summary(paper_order), _paper_order_json(paper_order)),
        _event(report_id, workflow_id, 6, "review_audit", "Review & Audit", "Review", "audit_report", report_id, "completed", "Local audit report generated with a tamper-evident hash.", {"audit_report_id": report_id}),
    ]


def _event(report_id: str, workflow_id: str, index: int, step_key: str, title: str, actor: str, entity_type: str, entity_id: str | None, status: str, summary: str, details: dict) -> dict:
    return {
        "id": prefixed_id("ae"),
        "audit_report_id": report_id,
        "workflow_id": workflow_id,
        "step_index": index,
        "step_key": step_key,
        "title": title,
        "status": status,
        "actor": actor,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "summary": summary,
        "details": details,
    }


def _build_evidence(
    report_id: str,
    workflow_id: str,
    market_event: MarketEvent | None,
    ai_analysis: AIAnalysis | None,
    hypothesis: Hypothesis,
    backtest: BacktestResult | None,
    risk_check: RiskCheck | None,
    paper_order: PaperOrder | None,
    action_logs: list[ActionLog],
    paper_logs: list[PaperExecutionLog],
) -> list[dict]:
    evidence = [
        _evidence(report_id, workflow_id, "market", "market_event", market_event.id if market_event else None, "Market event snapshot", _market_event_json(market_event)),
        _evidence(report_id, workflow_id, "agent", "hypothesis", hypothesis.id, "Agent hypothesis", _hypothesis_json(hypothesis)),
        _evidence(report_id, workflow_id, "ai", "ai_analysis", ai_analysis.id if ai_analysis else None, "AI analysis metadata", _ai_analysis_json(ai_analysis)),
        _evidence(report_id, workflow_id, "backtest", "backtest", backtest.id if backtest else None, "Backtest result", _backtest_json(backtest)),
        _evidence(report_id, workflow_id, "risk", "risk_check", risk_check.id if risk_check else None, "Risk firewall result", _risk_json(risk_check)),
        _evidence(report_id, workflow_id, "execution", "paper_order", paper_order.id if paper_order else None, "Paper execution record", _paper_order_json(paper_order)),
    ]
    if action_logs:
        evidence.append(_evidence(report_id, workflow_id, "log", "action_log", None, "Workflow action logs", {"items": [_action_log_json(item) for item in action_logs]}))
    if paper_logs:
        evidence.append(_evidence(report_id, workflow_id, "log", "paper_execution_log", None, "Paper execution logs", {"items": [_paper_log_json(item) for item in paper_logs]}))
    return evidence


def _evidence(report_id: str, workflow_id: str, evidence_type: str, entity_type: str, entity_id: str | None, title: str, payload: dict) -> dict:
    status = payload.get("status", "recorded")
    summary = payload.get("summary") or payload.get("message") or f"{title} evidence {status}."
    return {
        "id": prefixed_id("ev"),
        "audit_report_id": report_id,
        "workflow_id": workflow_id,
        "evidence_type": evidence_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "title": title,
        "summary": str(summary),
        "payload": payload,
    }


def _hypothesis_json(hypothesis: Hypothesis | None) -> dict:
    if not hypothesis:
        return {"status": "missing"}
    return {
        "id": hypothesis.id,
        "workflow_id": hypothesis.workflow_id,
        "market_event_id": hypothesis.market_event_id,
        "ai_analysis_id": hypothesis.ai_analysis_id,
        "symbol": hypothesis.symbol,
        "timeframe": hypothesis.timeframe,
        "direction": hypothesis.direction,
        "entry_condition": hypothesis.entry_condition,
        "invalid_condition": hypothesis.invalid_condition,
        "stop_loss": hypothesis.stop_loss,
        "take_profit": hypothesis.take_profit,
        "confidence": hypothesis.confidence,
        "feasibility": hypothesis.feasibility,
        "risk": hypothesis.risk,
        "summary": hypothesis.summary,
        "reasons": hypothesis.reasons_json,
        "warnings": hypothesis.warnings_json,
        "is_mock": hypothesis.is_mock,
        "source": hypothesis.source,
        "status": hypothesis.status,
        "created_at": _iso(hypothesis.created_at),
    }


def _backtest_json(backtest: BacktestResult | None) -> dict:
    if not backtest:
        return {"status": "missing"}
    return {
        "id": backtest.id,
        "workflow_id": backtest.workflow_id,
        "backtest_job_id": backtest.backtest_job_id,
        "hypothesis_id": backtest.hypothesis_id,
        "status": backtest.status,
        "win_rate": backtest.win_rate,
        "profit_factor": backtest.profit_factor,
        "expectancy": backtest.expectancy,
        "max_drawdown": backtest.max_drawdown,
        "trade_count": backtest.trade_count,
        "avg_rr": backtest.avg_rr,
        "sample_quality": backtest.sample_quality,
        "equity_curve": backtest.equity_curve_json,
        "trades": backtest.trades_json,
        "metrics": backtest.metrics_json,
        "is_mock": backtest.is_mock,
        "source": backtest.source,
        "created_at": _iso(backtest.created_at),
    }


def _risk_json(risk_check: RiskCheck | None) -> dict:
    if not risk_check:
        return {"status": "missing"}
    return {
        "id": risk_check.id,
        "workflow_id": risk_check.workflow_id,
        "hypothesis_id": risk_check.hypothesis_id,
        "backtest_id": risk_check.backtest_id,
        "decision": risk_check.decision,
        "risk_level": risk_check.risk_level,
        "risk_score": risk_check.risk_score,
        "checks": risk_check.checks_json,
        "warnings": risk_check.warnings_json,
        "block_reasons": risk_check.block_reasons_json,
        "is_mock": risk_check.is_mock,
        "source": risk_check.source,
        "status": risk_check.status,
        "created_at": _iso(risk_check.created_at),
    }


def _paper_order_json(paper_order: PaperOrder | None) -> dict:
    if not paper_order:
        return {"status": "not_created", "is_real_trade": False, "execution_mode": "paper"}
    return {
        "id": paper_order.id,
        "workflow_id": paper_order.workflow_id,
        "hypothesis_id": paper_order.hypothesis_id,
        "backtest_id": paper_order.backtest_id,
        "risk_check_id": paper_order.risk_check_id,
        "status": paper_order.status,
        "symbol": paper_order.symbol,
        "side": paper_order.side,
        "order_type": paper_order.order_type,
        "price": paper_order.price,
        "quantity": paper_order.quantity,
        "stop_loss": paper_order.stop_loss,
        "take_profit": paper_order.take_profit,
        "is_real_trade": paper_order.is_real_trade,
        "execution_mode": paper_order.execution_mode,
        "mode": paper_order.mode,
        "is_mock": paper_order.is_mock,
        "source": paper_order.source,
        "created_at": _iso(paper_order.created_at),
    }


def _market_event_json(market_event: MarketEvent | None) -> dict:
    if not market_event:
        return {"status": "missing"}
    return {
        "id": market_event.id,
        "workflow_id": market_event.workflow_id,
        "symbol": market_event.symbol,
        "title": market_event.title,
        "summary": market_event.summary,
        "event_type": market_event.event_type,
        "severity": market_event.severity,
        "is_mock": market_event.is_mock,
        "source": market_event.source,
        "status": market_event.status,
        "detected_at": _iso(market_event.detected_at),
    }


def _ai_analysis_json(ai_analysis: AIAnalysis | None) -> dict:
    if not ai_analysis:
        return {"status": "missing"}
    return {
        "id": ai_analysis.id,
        "workflow_id": ai_analysis.workflow_id,
        "provider": ai_analysis.provider,
        "model": ai_analysis.model,
        "task": ai_analysis.task,
        "summary": ai_analysis.summary,
        "confidence": ai_analysis.confidence,
        "status": ai_analysis.status,
        "is_mock": ai_analysis.is_mock,
        "source": ai_analysis.source,
        "created_at": _iso(ai_analysis.created_at),
    }


def _action_log_json(action_log: ActionLog) -> dict:
    return {
        "id": action_log.id,
        "workflow_id": action_log.workflow_id,
        "action_type": action_log.action_type,
        "entity_type": action_log.entity_type,
        "entity_id": action_log.entity_id,
        "message": action_log.message,
        "status": action_log.status,
        "is_mock": action_log.is_mock,
        "source": action_log.source,
        "created_at": _iso(action_log.created_at),
    }


def _paper_log_json(log: PaperExecutionLog) -> dict:
    return {
        "id": log.id,
        "paper_order_id": log.paper_order_id,
        "hypothesis_id": log.hypothesis_id,
        "risk_check_id": log.risk_check_id,
        "event_type": log.event_type,
        "status": log.status,
        "message": log.message,
        "metadata": log.metadata_json,
        "created_at": _iso(log.created_at),
    }


def _event_schema(event: AuditEvent) -> dict:
    return {
        "id": event.id,
        "audit_report_id": event.audit_report_id,
        "workflow_id": event.workflow_id,
        "step_index": event.step_index,
        "step_key": event.step_key,
        "title": event.title,
        "status": event.status,
        "actor": event.actor,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "summary": event.summary,
        "details": event.details_json,
        "created_at": event.created_at,
    }


def _evidence_schema(evidence: AuditEvidence) -> dict:
    return {
        "id": evidence.id,
        "audit_report_id": evidence.audit_report_id,
        "workflow_id": evidence.workflow_id,
        "evidence_type": evidence.evidence_type,
        "entity_type": evidence.entity_type,
        "entity_id": evidence.entity_id,
        "title": evidence.title,
        "summary": evidence.summary,
        "payload": evidence.payload_json,
        "created_at": evidence.created_at,
    }


def _backtest_summary(backtest: BacktestResult | None) -> str:
    if not backtest:
        return "No linked backtest result found."
    return f"PF {backtest.profit_factor:.2f}, win rate {backtest.win_rate:.2%}, drawdown {backtest.max_drawdown:.2%}."


def _risk_summary(risk_check: RiskCheck | None) -> str:
    if not risk_check:
        return "No linked risk firewall result found."
    return f"{risk_check.decision} risk level {risk_check.risk_level}, score {risk_check.risk_score:.1f}."


def _paper_summary(paper_order: PaperOrder | None) -> str:
    if not paper_order:
        return "No paper execution record has been created."
    return f"{paper_order.status} {paper_order.execution_mode} {paper_order.side} order for {paper_order.quantity} {paper_order.symbol}."


def _lessons(backtest: BacktestResult | None, risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> list[str]:
    lessons = ["Demo workflow remains paper-only; no real exchange order was sent."]
    if backtest and backtest.is_mock:
        lessons.append("Backtest used simplified demo data and must be treated as mock evidence.")
    if risk_check and risk_check.decision.upper() in {"BLOCK", "BLOCKED", "REJECTED", "REJECT"}:
        lessons.append("Risk block correctly prevented execution.")
    if risk_check and risk_check.decision.upper() in {"WARNING", "CONDITIONAL"}:
        lessons.append("Conditional decisions may proceed to paper execution only with visible warnings.")
    if paper_order and not paper_order.is_real_trade:
        lessons.append("Paper order recorded execution_mode=paper and is_real_trade=false.")
    return lessons


def _copy_summary(report: AuditReport) -> str:
    return (
        f"Audit Report {report.id}\n"
        f"Symbol: {report.symbol}\n"
        f"Event Type: {report.event_type}\n"
        f"Status: {report.status}\n"
        f"Decision: {report.decision}\n"
        f"Risk Level: {report.risk_level}\n"
        f"Result: {report.result}\n"
        f"Outcome: {report.outcome}\n"
        f"Local tamper-evident audit hash: {report.audit_hash}\n"
        f"Summary: {report.summary}"
    )


def _hash_report(report_json: dict) -> str:
    serialized = json.dumps(report_json, sort_keys=True, separators=(",", ":"), default=_json_default)
    return "0x" + hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
