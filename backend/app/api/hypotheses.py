from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.hypothesis import HypothesisGenerateRequest, HypothesisResponse
from app.services.ai_gateway import AIGatewayError
from app.services.hypothesis_service import HypothesisService

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])
service = HypothesisService()


@router.post("/generate", response_model=HypothesisResponse)
def generate_hypothesis(request: HypothesisGenerateRequest, db: Session = Depends(get_db)) -> HypothesisResponse | JSONResponse:
    try:
        return HypothesisResponse(data=service.generate(db, request))
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
