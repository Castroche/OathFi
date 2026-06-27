from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.providers.market import MarketProviderError
from app.schemas.agent import (
    AgentContextResponse,
    AgentHypothesesGenerateResponse,
    AgentHypothesisPatchRequest,
    AgentHypothesisResponse,
    AgentHypothesisGenerateRequest,
    StrategyRuleResponse,
    StrategyRuleWriteRequest,
)
from app.services.agent_service import AgentService
from app.services.ai_gateway import AIGatewayError
from app.services.strategy_rule_service import StrategyRuleService

router = APIRouter(prefix="/agent", tags=["agent"])
service = AgentService()
strategy_rules = StrategyRuleService()


def provider_error_response(exc: AIGatewayError) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={
            "ok": False,
            "error": {
                "code": "AI_PROVIDER_FAILED",
                "message": str(exc),
                "details": {"ai_analysis_id": exc.ai_analysis_id, "provider": exc.provider},
            },
        },
    )


@router.get("/context", response_model=AgentContextResponse)
def get_agent_context(
    symbol: str = Query(default="ETH/USDT"),
    timeframe: str = Query(default="15m"),
    db: Session = Depends(get_db),
) -> AgentContextResponse:
    try:
        return AgentContextResponse(data=service.serialize_context(service.context_for(db, symbol, timeframe)))
    except MarketProviderError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "ok": False,
                "error": {
                    "code": "MARKET_SOURCE_UNAVAILABLE",
                    "message": str(exc),
                    "details": {"source": "htx"},
                },
            },
        ) from exc


@router.post("/hypotheses/generate", response_model=AgentHypothesesGenerateResponse)
def generate_agent_hypotheses(
    request: AgentHypothesisGenerateRequest,
    db: Session = Depends(get_db),
) -> AgentHypothesesGenerateResponse | JSONResponse:
    try:
        return AgentHypothesesGenerateResponse(data=service.generate(db, request))
    except AIGatewayError as exc:
        return provider_error_response(exc)


@router.get("/hypotheses/{hypothesis_id}", response_model=AgentHypothesisResponse)
def get_agent_hypothesis(hypothesis_id: str, db: Session = Depends(get_db)) -> AgentHypothesisResponse:
    hypothesis = service.get_hypothesis(db, hypothesis_id)
    if hypothesis is None:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return AgentHypothesisResponse(data=hypothesis)


@router.patch("/hypotheses/{hypothesis_id}", response_model=AgentHypothesisResponse)
def patch_agent_hypothesis(
    hypothesis_id: str,
    request: AgentHypothesisPatchRequest,
    db: Session = Depends(get_db),
) -> AgentHypothesisResponse:
    hypothesis = service.patch_hypothesis(db, hypothesis_id, request)
    if hypothesis is None:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return AgentHypothesisResponse(data=hypothesis)


@router.post("/hypotheses/{hypothesis_id}/reject", response_model=AgentHypothesisResponse)
def reject_agent_hypothesis(hypothesis_id: str, db: Session = Depends(get_db)) -> AgentHypothesisResponse:
    hypothesis = service.reject_hypothesis(db, hypothesis_id)
    if hypothesis is None:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return AgentHypothesisResponse(data=hypothesis)


@router.post("/hypotheses/{hypothesis_id}/strategy-rule", response_model=StrategyRuleResponse)
def create_strategy_rule(
    hypothesis_id: str,
    request: StrategyRuleWriteRequest,
    db: Session = Depends(get_db),
) -> StrategyRuleResponse:
    from app.models.hypothesis import Hypothesis

    hypothesis = db.get(Hypothesis, hypothesis_id)
    if hypothesis is None:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    rule = strategy_rules.create_or_update_from_hypothesis(db, hypothesis, request)
    return StrategyRuleResponse(data=strategy_rules.serialize(rule))
