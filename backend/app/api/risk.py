from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.providers.market import MarketProviderError
from app.db.session import get_db
from app.schemas.risk import RiskCheckListResponse, RiskCheckRequest, RiskCheckResponse
from app.services.risk_engine import RiskEngine

router = APIRouter(prefix="/risk", tags=["risk"])
service = RiskEngine()


@router.post("/check", response_model=RiskCheckResponse)
def check_risk(request: RiskCheckRequest, db: Session = Depends(get_db)) -> RiskCheckResponse:
    try:
        return RiskCheckResponse(data=service.check(db, request))
    except MarketProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/checks/{risk_check_id}", response_model=RiskCheckResponse)
def get_risk_check(risk_check_id: str, db: Session = Depends(get_db)) -> RiskCheckResponse:
    risk_check = service.get(db, risk_check_id)
    if risk_check is None:
        raise HTTPException(status_code=404, detail="Risk check not found")
    return RiskCheckResponse(data=risk_check)


@router.get("/checks", response_model=RiskCheckListResponse)
def list_risk_checks(db: Session = Depends(get_db)) -> RiskCheckListResponse:
    return RiskCheckListResponse(data=service.list(db))
