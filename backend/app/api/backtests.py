from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.providers.market import MarketProviderError
from app.db.session import get_db
from app.schemas.backtest import BacktestCreateRequest, BacktestListResponse, BacktestResponse
from app.services.backtest_service import BacktestService

router = APIRouter(prefix="/backtests", tags=["backtests"])
service = BacktestService()


@router.post("", response_model=BacktestResponse)
def create_backtest(request: BacktestCreateRequest, db: Session = Depends(get_db)) -> BacktestResponse:
    try:
        return BacktestResponse(data=service.run(db, request))
    except MarketProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=BacktestListResponse)
def list_backtests(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)) -> BacktestListResponse:
    return BacktestListResponse(data=service.list(db, limit=limit))


@router.get("/{backtest_id}", response_model=BacktestResponse)
def get_backtest(backtest_id: str, db: Session = Depends(get_db)) -> BacktestResponse:
    backtest = service.get(db, backtest_id)
    if backtest is None:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return BacktestResponse(data=backtest)
