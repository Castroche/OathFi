from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.action_log import ActionLog
from app.models.ai_analysis import AIAnalysis
from app.models.audit_report import AuditReport
from app.models.hypothesis import Hypothesis
from app.models.market_event import MarketEvent
from app.models.risk_check import RiskCheck
from app.services.market_data_service import MarketDataService


DASHBOARD_SYMBOLS = ["BTC/USDT", "ETH/USDT", "HTX/USDT"]


class DashboardService:
    def __init__(self) -> None:
        self.market_data = MarketDataService()

    def get_summary(self, db: Session) -> dict:
        market_status = self.market_data.get_source_status()
        provider = (market_status.get("providers") or [{}])[0]
        latest_analysis = db.scalar(
            select(AIAnalysis).where(AIAnalysis.is_mock.is_(False)).order_by(AIAnalysis.created_at.desc()).limit(1)
        )
        latest_risk = db.scalar(
            select(RiskCheck).where(RiskCheck.is_mock.is_(False)).order_by(RiskCheck.created_at.desc()).limit(1)
        )
        active_events = db.scalar(
            select(MarketEvent).where(MarketEvent.is_mock.is_(False)).order_by(MarketEvent.created_at.desc()).limit(1)
        )
        active_event_count = len(
            list(
                db.scalars(
                    select(MarketEvent).where(MarketEvent.is_mock.is_(False)).order_by(MarketEvent.created_at.desc()).limit(50)
                )
            )
        )

        return {
            "market_pulse": {
                "symbols": DASHBOARD_SYMBOLS,
                "status": provider.get("status", "disconnected"),
                "latency_ms": provider.get("latency_ms"),
                "source": provider.get("source", "htx_ws"),
                "active_events": active_event_count,
            },
            "agent_status": {
                "running": bool(latest_analysis and latest_analysis.status in {"completed", "ready", "ready_for_backtest"}),
                "current_task": latest_analysis.task if latest_analysis else None,
                "model_provider": latest_analysis.provider if latest_analysis else None,
                "last_analysis_at": latest_analysis.created_at if latest_analysis else None,
                "status": latest_analysis.status if latest_analysis else "disconnected",
            },
            "risk_summary": self._risk_summary(latest_risk, active_events),
        }

    def get_opportunity(self, db: Session) -> dict | None:
        hypotheses = list(
            db.scalars(
                select(Hypothesis)
                .where(Hypothesis.is_mock.is_(False))
                .order_by(Hypothesis.created_at.desc())
                .limit(20)
            )
        )
        hypothesis = next(
            (
                item
                for item in hypotheses
                if not self._hypothesis_uses_mock_context(db, item)
            ),
            None,
        )
        if not hypothesis:
            return None
        return {
            "symbol": hypothesis.symbol,
            "setup": hypothesis.summary,
            "setup_quality": max(0, min(100, int(round((hypothesis.confidence + hypothesis.feasibility) / 2)))),
            "time_horizon": self._time_horizon(hypothesis.timeframe),
            "confidence": self._confidence_label(hypothesis.confidence),
            "direction": hypothesis.direction,
            "risk_reward": self._risk_reward(hypothesis),
            "hypothesis_id": hypothesis.id,
            "market_event_id": hypothesis.market_event_id,
            "source": hypothesis.source,
            "status": hypothesis.status,
            "is_mock": hypothesis.is_mock,
            "created_at": hypothesis.created_at,
        }

    def list_recent_decisions(self, db: Session, limit: int = 10) -> list[dict]:
        logs = list(
            db.scalars(
                select(ActionLog).where(ActionLog.is_mock.is_(False)).order_by(ActionLog.created_at.desc()).limit(limit)
            )
        )
        if logs:
            return [self._action_log_to_decision(log) for log in logs]

        reports = list(
            db.scalars(
                select(AuditReport).where(AuditReport.is_mock.is_(False)).order_by(AuditReport.created_at.desc()).limit(limit)
            )
        )
        return [
            {
                "id": report.id,
                "workflow_id": report.workflow_id,
                "action_type": "AUDIT_REPORT",
                "entity_type": "audit_report",
                "entity_id": report.id,
                "message": report.summary,
                "source": report.source,
                "status": report.status,
                "is_mock": report.is_mock,
                "created_at": report.created_at,
            }
            for report in reports
        ]

    def list_market_events(self, db: Session, limit: int = 5) -> list[MarketEvent]:
        return list(
            db.scalars(
                select(MarketEvent).where(MarketEvent.is_mock.is_(False)).order_by(MarketEvent.created_at.desc()).limit(limit)
            )
        )

    @staticmethod
    def _hypothesis_uses_mock_context(db: Session, hypothesis: Hypothesis) -> bool:
        if hypothesis.market_event_id:
            market_event = db.get(MarketEvent, hypothesis.market_event_id)
            if market_event and market_event.is_mock:
                return True
        text = " ".join(
            [
                hypothesis.summary or "",
                " ".join(hypothesis.reasons_json or []),
                " ".join(hypothesis.warnings_json or []),
            ]
        ).lower()
        return "mock" in text

    @staticmethod
    def _risk_summary(risk_check: RiskCheck | None, event: MarketEvent | None) -> dict:
        if not risk_check:
            volatility_score = min(100, max(0, (event.severity * 12) if event else 0))
            return {
                "global_risk_level": "unknown" if not event else "medium",
                "volatility_score": volatility_score,
                "liquidity_score": 0,
                "execution_mode": "paper",
                "live_trading_enabled": False,
                "latest_decision": None,
                "last_checked_at": None,
            }

        warning_count = len(risk_check.warnings_json or [])
        block_count = len(risk_check.block_reasons_json or [])
        if risk_check.decision == "BLOCK" or block_count:
            level = "high"
        elif risk_check.decision == "WARNING" or warning_count:
            level = "medium"
        else:
            level = "low"

        volatility_score = min(100, 35 + warning_count * 12 + block_count * 22)
        liquidity_score = max(0, min(100, 80 - warning_count * 8 - block_count * 20))
        return {
            "global_risk_level": level,
            "volatility_score": volatility_score,
            "liquidity_score": liquidity_score,
            "execution_mode": "paper",
            "live_trading_enabled": False,
            "latest_decision": risk_check.decision,
            "last_checked_at": risk_check.created_at,
        }

    @staticmethod
    def _confidence_label(confidence: int) -> str:
        if confidence >= 80:
            return "high"
        if confidence >= 68:
            return "medium-high"
        if confidence >= 50:
            return "medium"
        return "low"

    @staticmethod
    def _time_horizon(timeframe: str) -> str:
        if timeframe in {"1m", "5m", "15m"}:
            return "intraday"
        if timeframe in {"1h", "4h"}:
            return "1-3 days"
        return "multi-day"

    @staticmethod
    def _risk_reward(hypothesis: Hypothesis) -> float | None:
        if hypothesis.stop_loss is None or hypothesis.take_profit is None:
            return None
        entry = _extract_entry_price(hypothesis.entry_condition)
        if entry is None:
            return None
        risk = abs(entry - hypothesis.stop_loss)
        reward = abs(hypothesis.take_profit - entry)
        if risk <= 0:
            return None
        return round(reward / risk, 2)

    @staticmethod
    def _action_log_to_decision(log: ActionLog) -> dict:
        return {
            "id": log.id,
            "workflow_id": log.workflow_id,
            "action_type": log.action_type,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "message": log.message,
            "source": log.source,
            "status": log.status,
            "is_mock": log.is_mock,
            "created_at": log.created_at,
        }


def _extract_entry_price(entry_condition: str) -> float | None:
    for token in entry_condition.replace(",", " ").split():
        try:
            return float(token)
        except ValueError:
            continue
    return None
