from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.hypothesis import Hypothesis
from app.models.strategy_rule import StrategyRule
from app.schemas.agent import StrategyRuleWriteRequest
from app.services.workflow_service import log_action


class StrategyRuleService:
    def create_or_update_from_hypothesis(
        self,
        db: Session,
        hypothesis: Hypothesis,
        request: StrategyRuleWriteRequest | None = None,
    ) -> StrategyRule:
        request = request or StrategyRuleWriteRequest()
        existing = db.scalar(select(StrategyRule).where(StrategyRule.hypothesis_id == hypothesis.id).order_by(StrategyRule.created_at.desc()).limit(1))
        rule = existing or StrategyRule(id=prefixed_id("rule"))
        entry_conditions = request.entry_conditions or [hypothesis.trigger or hypothesis.entry_condition]
        exit_conditions = request.exit_conditions or [hypothesis.invalidation or hypothesis.invalid_condition]
        risk_controls = request.risk_controls or [hypothesis.risk_note or "Use paper trading only; require risk firewall approval before execution."]
        strategy_name = request.strategy_name or f"{hypothesis.symbol} {hypothesis.label or 'Agent'} strategy"
        preview = request.preview or self._preview(hypothesis, entry_conditions, exit_conditions, risk_controls)

        rule.hypothesis_id = hypothesis.id
        rule.workflow_id = hypothesis.workflow_id
        rule.symbol = hypothesis.symbol
        rule.timeframe = hypothesis.timeframe
        rule.strategy_name = strategy_name
        rule.entry_conditions_json = entry_conditions
        rule.exit_conditions_json = exit_conditions
        rule.risk_controls_json = risk_controls
        rule.preview_json = preview
        rule.status = request.status
        rule.source = hypothesis.source
        rule.is_mock = hypothesis.is_mock
        rule.updated_at = now_utc()
        if existing is None:
            rule.created_at = now_utc()
            db.add(rule)
        log_action(
            db,
            action_type="SAVE_STRATEGY_RULE",
            entity_type="strategy_rule",
            entity_id=rule.id,
            workflow_id=rule.workflow_id,
            message="Saved strategy rule draft from Agent Lab hypothesis.",
            payload={"hypothesis_id": hypothesis.id, "status": rule.status},
            source=rule.source,
            status="completed",
            is_mock=rule.is_mock,
        )
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def serialize(rule: StrategyRule) -> dict[str, Any]:
        return {
            "id": rule.id,
            "hypothesis_id": rule.hypothesis_id,
            "workflow_id": rule.workflow_id,
            "symbol": rule.symbol,
            "timeframe": rule.timeframe,
            "strategy_name": rule.strategy_name,
            "entry_conditions": rule.entry_conditions_json,
            "exit_conditions": rule.exit_conditions_json,
            "risk_controls": rule.risk_controls_json,
            "preview": rule.preview_json,
            "status": rule.status,
            "created_at": rule.created_at,
            "updated_at": rule.updated_at,
            "source": rule.source,
            "is_mock": rule.is_mock,
        }

    @staticmethod
    def _preview(
        hypothesis: Hypothesis,
        entry_conditions: list[str],
        exit_conditions: list[str],
        risk_controls: list[str],
    ) -> dict[str, Any]:
        return {
            "hypothesis_label": hypothesis.label,
            "type": hypothesis.hypothesis_type,
            "confidence": hypothesis.confidence,
            "entry_count": len(entry_conditions),
            "exit_count": len(exit_conditions),
            "risk_control_count": len(risk_controls),
            "paper_trading_only": True,
        }
