from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import risk_blocked_error
from app.db.base import now_utc, prefixed_id
from app.models.paper_order import PaperOrder
from app.models.risk_check import RiskCheck
from app.schemas.paper_order import PaperOrderCreateRequest
from app.services.workflow_service import log_action, new_workflow_id


class PaperExecutionService:
    def create_order(self, db: Session, request: PaperOrderCreateRequest) -> dict:
        risk_check = db.scalar(select(RiskCheck).where(RiskCheck.id == request.risk_check_id))
        if risk_check is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "ok": False,
                    "error": {
                        "code": "RISK_CHECK_REQUIRED",
                        "message": "A stored risk check is required before paper order creation.",
                        "details": {"risk_check_id": request.risk_check_id},
                    },
                },
            )
        if risk_check and risk_check.decision == "BLOCK":
            raise risk_blocked_error(request.risk_check_id)
        workflow_id = risk_check.workflow_id if risk_check else new_workflow_id()
        order = PaperOrder(
            id=prefixed_id("po"),
            workflow_id=workflow_id,
            hypothesis_id=request.hypothesis_id,
            backtest_id=request.backtest_id,
            risk_check_id=request.risk_check_id,
            symbol=request.symbol,
            side=request.side,
            order_type=request.order_type,
            price=request.price,
            quantity=request.quantity,
            stop_loss=request.stop_loss,
            take_profit=request.take_profit,
            source=risk_check.source,
            status="created",
            is_mock=True,
            is_real_trade=False,
            execution_mode="paper",
            error_message=None,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(order)
        log_action(
            db,
            action_type="CREATE_PAPER_ORDER",
            entity_type="paper_order",
            entity_id=order.id,
            workflow_id=workflow_id,
            message="Created paper-only simulated order. No exchange order was sent.",
            payload={"is_real_trade": False, "real_trading_enabled": False, "execution_mode": "paper"},
            source=order.source,
            status="completed",
            is_mock=order.is_mock,
        )
        db.commit()
        db.refresh(order)
        return self.to_schema(order)

    def get(self, db: Session, paper_order_id: str) -> dict | None:
        order = db.get(PaperOrder, paper_order_id)
        return self.to_schema(order) if order else None

    @staticmethod
    def list(db: Session, limit: int = 50) -> list[dict]:
        stmt = select(PaperOrder).order_by(PaperOrder.created_at.desc()).limit(limit)
        return [PaperExecutionService.to_schema(order) for order in db.scalars(stmt)]

    @staticmethod
    def to_schema(order: PaperOrder) -> dict:
        return {
            "id": order.id,
            "workflow_id": order.workflow_id,
            "hypothesis_id": order.hypothesis_id,
            "backtest_id": order.backtest_id,
            "risk_check_id": order.risk_check_id,
            "status": order.status,
            "symbol": order.symbol,
            "side": order.side,
            "order_type": order.order_type,
            "price": order.price,
            "quantity": order.quantity,
            "stop_loss": order.stop_loss,
            "take_profit": order.take_profit,
            "is_real_trade": order.is_real_trade,
            "execution_mode": order.execution_mode,
            "created_at": order.created_at,
            "is_mock": order.is_mock,
            "source": order.source,
        }
