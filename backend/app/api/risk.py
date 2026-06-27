from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.providers.market import MarketProviderError
from app.db.session import get_db
from app.schemas.risk import RiskCheckListResponse, RiskCheckRequest, RiskCheckResponse, RiskRulesResponse
from app.services.risk_engine import RiskEngine, RiskInputError

router = APIRouter(prefix="/risk", tags=["risk"])
service = RiskEngine()


@router.post("/check", response_model=RiskCheckResponse)
def check_risk(request: RiskCheckRequest, db: Session = Depends(get_db)) -> RiskCheckResponse:
    return create_risk_check(request, db)


@router.post("/checks", response_model=RiskCheckResponse)
def create_risk_check(request: RiskCheckRequest, db: Session = Depends(get_db)) -> RiskCheckResponse | JSONResponse:
    try:
        return RiskCheckResponse(data=service.check(db, request))
    except RiskInputError as exc:
        return JSONResponse(
            status_code=400,
            content={
                "ok": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )
    except MarketProviderError as exc:
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "error": {
                    "code": "MARKET_SOURCE_UNAVAILABLE",
                    "message": str(exc),
                    "details": {"source": "htx"},
                },
            },
        )


@router.get("/rules", response_model=RiskRulesResponse)
def list_risk_rules() -> RiskRulesResponse:
    return RiskRulesResponse(data=service.rules())


@router.get("/checks/{risk_check_id}", response_model=RiskCheckResponse)
def get_risk_check(risk_check_id: str, db: Session = Depends(get_db)) -> RiskCheckResponse | JSONResponse:
    risk_check = service.get(db, risk_check_id)
    if risk_check is None:
        return JSONResponse(
            status_code=404,
            content={
                "ok": False,
                "error": {
                    "code": "RISK_CHECK_NOT_FOUND",
                    "message": "Risk check not found.",
                    "details": {"risk_check_id": risk_check_id},
                },
            },
        )
    return RiskCheckResponse(data=risk_check)


@router.get("/checks", response_model=RiskCheckListResponse)
def list_risk_checks(db: Session = Depends(get_db)) -> RiskCheckListResponse:
    return RiskCheckListResponse(data=service.list(db))
