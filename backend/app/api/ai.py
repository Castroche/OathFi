from time import perf_counter

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.schemas.ai import AIAnalysisResponse, AIAnalyzeRequest, AIProviderTestRequest
from app.services.ai import AIProviderRegistry
from app.services.ai_gateway import AIGateway, AIGatewayError

router = APIRouter(prefix="/ai", tags=["ai"])
service = AIGateway()
registry = AIProviderRegistry()


@router.post("/analyze", response_model=AIAnalysisResponse)
def analyze(request: AIAnalyzeRequest, db: Session = Depends(get_db)) -> AIAnalysisResponse | JSONResponse:
    try:
        return AIAnalysisResponse(data=service.analyze(db, request))
    except AIGatewayError as exc:
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


@router.get("/providers")
def list_providers() -> dict:
    return {"ok": True, "data": [item.model_dump() for item in registry.statuses()]}


@router.post("/providers/test")
def test_provider(request: AIProviderTestRequest) -> dict:
    provider = registry.get(request.provider)
    config = registry.config_for(request.provider)
    model = request.model or (config.default_model if config else "")
    if provider is None or config is None:
        return {
            "ok": True,
            "data": {
                "ok": False,
                "provider": request.provider,
                "model": model,
                "latency_ms": 0,
                "error_type": "provider_error",
                "error_message": "Provider is not registered.",
            },
        }
    if not config.configured:
        return {
            "ok": True,
            "data": {
                "ok": False,
                "provider": config.name,
                "model": model,
                "latency_ms": 0,
                "error_type": "not_configured",
                "error_message": f"{config.display_name} is not configured. Configure the API key in backend/.env.",
            },
        }
    started = perf_counter()
    result = provider.generate_json(
        prompt="Return exactly this JSON object: {\"status\":\"ok\"}",
        schema={"type": "object", "required": ["status"], "properties": {"status": {"type": "string"}}},
        model=model,
        timeout=min(settings.ai_timeout_seconds, 20),
    )
    latency_ms = result.latency_ms or int((perf_counter() - started) * 1000)
    registry.mark_health(config.name, healthy=result.ok, last_error=result.error_message)
    return {
        "ok": True,
        "data": {
            "ok": result.ok,
            "provider": config.name,
            "model": model,
            "latency_ms": latency_ms,
            "error_type": result.error_type,
            "error_message": result.error_message,
        },
    }


@router.get("/models")
def list_models(provider: str = Query(default="deepseek")) -> dict:
    return {"ok": True, "data": registry.models_for(provider)}


@router.get("/config/debug")
def config_debug() -> dict:
    return {"ok": True, "data": registry.safe_debug_config()}
