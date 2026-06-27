from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.action_log import ActionLog
from app.models.ai_analysis import AIAnalysis
from app.models.audit_report import AuditReport
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.market_event import MarketEvent
from app.models.paper_order import PaperOrder
from app.models.risk_check import RiskCheck
from app.schemas.audit_report import AuditReportCreateRequest
from app.services.workflow_service import log_action, new_workflow_id


class AuditService:
    def create_report(self, db: Session, request: AuditReportCreateRequest) -> dict:
        hypothesis = db.get(Hypothesis, request.hypothesis_id)
        workflow_id = hypothesis.workflow_id if hypothesis else new_workflow_id()
        symbol = hypothesis.symbol if hypothesis else "ETH/USDT"
        ai_analysis = db.get(AIAnalysis, hypothesis.ai_analysis_id) if hypothesis and hypothesis.ai_analysis_id else None
        market_event = db.get(MarketEvent, hypothesis.market_event_id) if hypothesis and hypothesis.market_event_id else None
        backtest = db.get(BacktestResult, request.backtest_id) if request.backtest_id else _latest_for_workflow(db, BacktestResult, workflow_id)
        risk_check = db.get(RiskCheck, request.risk_check_id) if request.risk_check_id else _latest_for_workflow(db, RiskCheck, workflow_id)
        paper_order = db.get(PaperOrder, request.paper_order_id) if request.paper_order_id else _latest_for_workflow(db, PaperOrder, workflow_id)
        action_logs = list(
            db.scalars(
                select(ActionLog)
                .where(ActionLog.workflow_id == workflow_id)
                .order_by(ActionLog.created_at.asc())
            )
        )
        final_decision = _final_decision(risk_check, paper_order)
        market_context = {
            "workflow_id": workflow_id,
            "market_event": _market_event_json(market_event),
            "ai_analysis": _ai_analysis_json(ai_analysis),
            "action_logs": [_action_log_json(item) for item in action_logs],
            "source": _first_source(market_event, ai_analysis, backtest, risk_check, paper_order),
            "is_mock": any(bool(getattr(item, "is_mock", False)) for item in [market_event, ai_analysis, backtest, risk_check, paper_order] if item),
        }
        report = AuditReport(
            id=prefixed_id("audit"),
            workflow_id=workflow_id,
            title=f"{symbol} decision workflow audit",
            symbol=symbol,
            hypothesis_id=request.hypothesis_id,
            backtest_id=backtest.id if backtest else request.backtest_id,
            risk_check_id=risk_check.id if risk_check else request.risk_check_id,
            paper_order_id=paper_order.id if paper_order else request.paper_order_id,
            summary=_summary(symbol, hypothesis, backtest, risk_check, paper_order),
            market_context_json=market_context,
            hypothesis_json=_hypothesis_json(hypothesis),
            backtest_json=_backtest_json(backtest),
            risk_json=_risk_json(risk_check),
            paper_execution_json=_paper_order_json(paper_order),
            final_decision=final_decision,
            lessons_json=_lessons(backtest, risk_check, paper_order),
            source=market_context["source"],
            status="completed",
            is_mock=market_context["is_mock"],
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(report)
        log_action(
            db,
            action_type="GENERATE_AUDIT_REPORT",
            entity_type="audit_report",
            entity_id=report.id,
            workflow_id=workflow_id,
            message="Stored workflow audit report with linked market, AI, backtest, risk, paper order, and action log context.",
            payload={"final_decision": final_decision},
            source=report.source,
            status="completed",
            is_mock=report.is_mock,
        )
        db.commit()
        db.refresh(report)
        return self.to_schema(report)

    def get_report(self, db: Session, report_id: str) -> dict | None:
        report = db.scalar(select(AuditReport).where(AuditReport.id == report_id))
        return self.to_schema(report) if report else None

    def list_reports(self, db: Session, limit: int = 50) -> list[dict]:
        stmt = select(AuditReport).order_by(AuditReport.created_at.desc()).limit(limit)
        return [self.to_schema(report) for report in db.scalars(stmt)]

    @staticmethod
    def to_schema(report: AuditReport) -> dict:
        return {
            "id": report.id,
            "workflow_id": report.workflow_id,
            "title": report.title,
            "symbol": report.symbol,
            "summary": report.summary,
            "market_context": report.market_context_json,
            "hypothesis": report.hypothesis_json,
            "backtest_result": report.backtest_json,
            "risk_result": report.risk_json,
            "paper_execution": report.paper_execution_json,
            "final_decision": report.final_decision,
            "lessons": report.lessons_json,
            "created_at": report.created_at,
            "is_mock": report.is_mock,
            "source": report.source,
            "status": report.status,
        }


def _latest_for_workflow(db: Session, model, workflow_id: str):
    return db.scalar(
        select(model)
        .where(model.workflow_id == workflow_id)
        .order_by(model.created_at.desc())
        .limit(1)
    )


def _first_source(*items) -> str:
    for item in items:
        if item and getattr(item, "source", None):
            return item.source
    return "backend"


def _final_decision(risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> str:
    if risk_check and risk_check.decision == "BLOCK":
        return "BLOCK"
    if paper_order:
        return "PAPER_ORDER_CREATED"
    if risk_check and risk_check.decision == "WARNING":
        return "WARNING_AWAITING_PAPER_EXECUTION"
    if risk_check and risk_check.decision == "PASS":
        return "PASS_AWAITING_PAPER_EXECUTION"
    return "INCOMPLETE"


def _summary(symbol: str, hypothesis: Hypothesis | None, backtest: BacktestResult | None, risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> str:
    parts = [f"{symbol} workflow {hypothesis.workflow_id if hypothesis else 'unlinked'}"]
    if hypothesis:
        parts.append(f"hypothesis direction={hypothesis.direction}, confidence={hypothesis.confidence}")
    if backtest:
        parts.append(f"backtest PF={backtest.profit_factor:.2f}, win_rate={backtest.win_rate:.2%}")
    if risk_check:
        parts.append(f"risk={risk_check.decision}")
    if paper_order:
        parts.append(f"paper order={paper_order.status}, real_trade={paper_order.is_real_trade}")
    return "; ".join(parts)


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
        "checks": risk_check.checks_json,
        "warnings": risk_check.warnings_json,
        "block_reasons": risk_check.block_reasons_json,
        "is_mock": risk_check.is_mock,
        "source": risk_check.source,
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
        "is_mock": paper_order.is_mock,
        "source": paper_order.source,
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
        "created_at": action_log.created_at.isoformat(),
    }


def _lessons(backtest: BacktestResult | None, risk_check: RiskCheck | None, paper_order: PaperOrder | None) -> list[str]:
    lessons = ["Demo workflow remains paper-only; no real exchange order was sent."]
    if backtest and backtest.is_mock:
        lessons.append("Backtest used simplified demo data and must be treated as mock evidence.")
    if risk_check and risk_check.decision == "BLOCK":
        lessons.append("Risk BLOCK correctly prevented paper order creation.")
    if risk_check and risk_check.decision == "WARNING":
        lessons.append("WARNING decisions may proceed to paper execution only with visible warnings.")
    if paper_order and not paper_order.is_real_trade:
        lessons.append("Paper order recorded execution_mode=paper and is_real_trade=false.")
    return lessons
