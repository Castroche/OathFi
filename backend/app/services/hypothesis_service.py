from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.hypothesis import Hypothesis
from app.models.market_event import MarketEvent
from app.schemas.hypothesis import HypothesisGenerateRequest
from app.services.ai_gateway import AIGateway, AIGatewayError
from app.services.workflow_service import log_action, new_workflow_id


class HypothesisAIOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    direction: Literal["long", "short", "neutral", "no_trade"]
    entry_condition: str
    invalid_condition: str
    stop_loss: float | None = None
    take_profit: float | None = None
    confidence: int
    feasibility: int
    risk: int
    long_confidence: int | None = None
    short_confidence: int | None = None
    summary: str
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    @field_validator("confidence", "feasibility", "risk", "long_confidence", "short_confidence")
    @classmethod
    def score_range(cls, value: int | None) -> int | None:
        if value is None:
            return value
        return max(0, min(int(value), 100))


class HypothesisService:
    def __init__(self) -> None:
        self.ai_gateway = AIGateway()

    def generate(self, db: Session, request: HypothesisGenerateRequest) -> dict:
        workflow_id = new_workflow_id()
        ai_request = request_to_ai_request(request)
        ai_result = self.ai_gateway.run_analysis(db, ai_request, workflow_id=workflow_id)
        try:
            ai_output = HypothesisAIOutput.model_validate(ai_result["raw_output"])
        except ValidationError as exc:
            self.ai_gateway.mark_analysis_failed(
                db,
                analysis_id=ai_result["ai_analysis_id"],
                error_message=f"AI hypothesis output failed schema validation: {exc}",
            )
            db.commit()
            raise AIGatewayError("AI hypothesis output failed schema validation.", ai_analysis_id=ai_result["ai_analysis_id"]) from exc

        hypothesis = Hypothesis(
            id=prefixed_id("hyp"),
            workflow_id=workflow_id,
            market_event_id=request.market_event_id,
            ai_analysis_id=ai_result["ai_analysis_id"],
            symbol=request.symbol,
            timeframe=request.timeframe,
            direction=ai_output.direction,
            entry_condition=ai_output.entry_condition,
            invalid_condition=ai_output.invalid_condition,
            stop_loss=ai_output.stop_loss,
            take_profit=ai_output.take_profit,
            confidence=ai_output.confidence,
            feasibility=ai_output.feasibility,
            risk=ai_output.risk,
            long_confidence=ai_output.long_confidence,
            short_confidence=ai_output.short_confidence,
            summary=ai_output.summary,
            reasons_json=ai_output.reasons,
            warnings_json=ai_output.warnings,
            source=ai_result["source"],
            status="ready_for_backtest",
            is_mock=ai_result["is_mock"],
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(hypothesis)
        if request.market_event_id:
            market_event = db.get(MarketEvent, request.market_event_id)
            if market_event:
                market_event.workflow_id = workflow_id
                market_event.updated_at = now_utc()
        log_action(
            db,
            action_type="GENERATE_HYPOTHESIS",
            entity_type="hypothesis",
            entity_id=hypothesis.id,
            workflow_id=workflow_id,
            message="Stored AI-generated structured hypothesis.",
            payload={"ai_analysis_id": ai_result["ai_analysis_id"], "provider": ai_result["provider"]},
            source=ai_result["source"],
            status="completed",
            is_mock=ai_result["is_mock"],
        )
        db.commit()
        db.refresh(hypothesis)
        return {
            "id": hypothesis.id,
            "hypothesis_id": hypothesis.id,
            "workflow_id": hypothesis.workflow_id,
            "market_event_id": hypothesis.market_event_id,
            "ai_analysis_id": hypothesis.ai_analysis_id,
            "provider": ai_result["provider"],
            "model": ai_result["model"],
            "title": hypothesis.summary,
            "symbol": hypothesis.symbol,
            "side": hypothesis.direction,
            "timeframe": hypothesis.timeframe,
            "direction": hypothesis.direction,
            "thesis": hypothesis.summary,
            "entry_condition": hypothesis.entry_condition,
            "invalid_condition": hypothesis.invalid_condition,
            "stop_loss": hypothesis.stop_loss,
            "take_profit": hypothesis.take_profit,
            "confidence": hypothesis.confidence,
            "feasibility": hypothesis.feasibility,
            "risk": hypothesis.risk,
            "long_confidence": hypothesis.long_confidence,
            "short_confidence": hypothesis.short_confidence,
            "summary": hypothesis.summary,
            "reasons": hypothesis.reasons_json,
            "warnings": hypothesis.warnings_json,
            "latest_backtest_result_id": hypothesis.latest_backtest_result_id,
            "latest_risk_check_id": hypothesis.latest_risk_check_id,
            "latest_paper_order_id": hypothesis.latest_paper_order_id,
            "created_at": hypothesis.created_at,
            "is_mock": hypothesis.is_mock,
            "source": hypothesis.source,
            "status": hypothesis.status,
        }


def request_to_ai_request(request: HypothesisGenerateRequest):
    from app.schemas.ai import AIAnalyzeRequest

    context = {
        **(request.context or {}),
        "timeframe": request.timeframe,
    }
    return AIAnalyzeRequest(
        symbol=request.symbol,
        task="hypothesis_generation",
        provider=request.provider,
        context=context,
    )
