from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.risk_check import RiskCheck
from app.schemas.paper_order import PaperOrderCreateRequest, PaperOrderListResponse, PaperOrderResponse
from app.services.paper_execution_service import PaperExecutionService

router = APIRouter(prefix="/paper-orders", tags=["paper-orders"])
service = PaperExecutionService()


@router.post("", response_model=PaperOrderResponse)
def create_paper_order(request: PaperOrderCreateRequest, db: Session = Depends(get_db)) -> PaperOrderResponse | JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "ok": False,
            "error": {
                "code": "EXECUTION_NOT_CONNECTED",
                "message": "Exchange execution is not connected. Simulated paper order creation is disabled.",
            },
        },
    )
    risk_check = db.get(RiskCheck, request.risk_check_id)
    if risk_check and risk_check.decision == "BLOCK":
        block_reasons = risk_check.block_reasons_json or ["Risk decision is BLOCK."]
        return JSONResponse(
            status_code=409,
            content={
                "ok": False,
                "error": {
                    "code": "RISK_BLOCKED",
                    "message": "Risk decision is BLOCK. Paper order creation is not allowed.",
                    "details": {"risk_check_id": request.risk_check_id, "block_reasons": block_reasons},
                },
            },
        )
    try:
        return PaperOrderResponse(data=service.create_order(db, request))
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and "ok" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise


@router.get("", response_model=PaperOrderListResponse)
def list_paper_orders(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)) -> PaperOrderListResponse:
    return PaperOrderListResponse(data=service.list(db, limit=limit))


@router.get("/{paper_order_id}", response_model=PaperOrderResponse)
def get_paper_order(paper_order_id: str, db: Session = Depends(get_db)) -> PaperOrderResponse:
    order = service.get(db, paper_order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Paper order not found")
    return PaperOrderResponse(data=order)
