from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.paper_order import (
    PaperAccountResponse,
    PaperExecutionLogListResponse,
    PaperOrderCreateRequest,
    PaperOrderListResponse,
    PaperOrderResponse,
    PaperPositionListResponse,
)
from app.services.paper_execution_service import PaperExecutionService

router = APIRouter(prefix="/paper-orders", tags=["paper-orders"])
service = PaperExecutionService()


@router.post("", response_model=PaperOrderResponse)
def create_paper_order(request: PaperOrderCreateRequest, db: Session = Depends(get_db)) -> PaperOrderResponse | JSONResponse:
    try:
        return PaperOrderResponse(data=service.create_order(db, request))
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and "ok" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise


@router.get("", response_model=PaperOrderListResponse)
def list_paper_orders(
    limit: int = Query(default=50, ge=1, le=100),
    status: str | None = Query(default=None),
    symbol: str | None = Query(default=None),
    hypothesis_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PaperOrderListResponse:
    return PaperOrderListResponse(data=service.list(db, limit=limit, status_filter=status, symbol=symbol, hypothesis_id=hypothesis_id))


@router.get("/{paper_order_id}", response_model=PaperOrderResponse)
def get_paper_order(paper_order_id: str, db: Session = Depends(get_db)) -> PaperOrderResponse | JSONResponse:
    order = service.get(db, paper_order_id)
    if order is None:
        return JSONResponse(
            status_code=404,
            content={
                "ok": False,
                "error": {
                    "code": "PAPER_ORDER_NOT_FOUND",
                    "message": "Paper order not found.",
                    "details": {"paper_order_id": paper_order_id},
                },
            },
        )
    return PaperOrderResponse(data=order)


@router.post("/{paper_order_id}/execute", response_model=PaperOrderResponse)
def execute_paper_order(paper_order_id: str, db: Session = Depends(get_db)) -> PaperOrderResponse | JSONResponse:
    try:
        return PaperOrderResponse(data=service.execute_order(db, paper_order_id))
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and "ok" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise


@router.post("/{paper_order_id}/cancel", response_model=PaperOrderResponse)
def cancel_paper_order(paper_order_id: str, db: Session = Depends(get_db)) -> PaperOrderResponse | JSONResponse:
    try:
        return PaperOrderResponse(data=service.cancel_order(db, paper_order_id))
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and "ok" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise


account_router = APIRouter(tags=["paper-ledger"])


@account_router.get("/paper-account", response_model=PaperAccountResponse)
def get_paper_account(db: Session = Depends(get_db)) -> PaperAccountResponse:
    return PaperAccountResponse(data=service.get_account(db))


@account_router.get("/paper-positions", response_model=PaperPositionListResponse)
def list_paper_positions(status: str | None = Query(default="open"), db: Session = Depends(get_db)) -> PaperPositionListResponse:
    return PaperPositionListResponse(data=service.list_positions(db, status_filter=status))


@account_router.get("/paper-execution-logs", response_model=PaperExecutionLogListResponse)
def list_paper_execution_logs(
    limit: int = Query(default=100, ge=1, le=200),
    paper_order_id: str | None = Query(default=None),
    hypothesis_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PaperExecutionLogListResponse:
    return PaperExecutionLogListResponse(data=service.list_logs(db, limit=limit, paper_order_id=paper_order_id, hypothesis_id=hypothesis_id))
