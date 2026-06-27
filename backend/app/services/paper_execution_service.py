from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import risk_blocked_error
from app.db.base import now_utc, prefixed_id
from app.models.paper_order import PaperOrder
from app.models.risk_check import RiskCheck
from app.models.hypothesis import Hypothesis
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
        if risk_check and risk_check.decision in {"BLOCK", "REJECTED"}:
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
            price=risk_check.entry_price or request.price,
            quantity=risk_check.position_size or request.quantity,
            stop_loss=risk_check.stop_loss or request.stop_loss,
            take_profit=risk_check.take_profit if risk_check.take_profit is not None else request.take_profit,
            source=risk_check.source,
            status="draft",
            is_mock=risk_check.is_mock,
            is_real_trade=False,
            execution_mode="paper",
            error_message=None,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(order)
        hypothesis = db.get(Hypothesis, request.hypothesis_id)
        if hypothesis:
            hypothesis.latest_paper_order_id = order.id
            hypothesis.updated_at = now_utc()
        log_action(
            db,
            action_type="CREATE_PAPER_ORDER",
            entity_type="paper_order",
            entity_id=order.id,
            workflow_id=workflow_id,
            message="Created paper order draft from approved Risk Firewall check. No exchange order was sent.",
            payload={"risk_check_id": request.risk_check_id, "is_real_trade": False, "real_trading_enabled": False, "execution_mode": "paper"},
            source=order.source,
            status="completed",
            is_mock=order.is_mock,
        )
        db.commit()
        db.refresh(order)
        return self.to_schema(order, risk_check)

    def get(self, db: Session, paper_order_id: str) -> dict | None:
        order = db.get(PaperOrder, paper_order_id)
        risk_check = db.get(RiskCheck, order.risk_check_id) if order else None
        return self.to_schema(order, risk_check) if order else None

    @staticmethod
    def list(db: Session, limit: int = 50) -> list[dict]:
        stmt = select(PaperOrder).order_by(PaperOrder.created_at.desc()).limit(limit)
        orders = list(db.scalars(stmt))
        risk_checks = {risk.id: risk for risk in db.scalars(select(RiskCheck).where(RiskCheck.id.in_([order.risk_check_id for order in orders])))} if orders else {}
        return [PaperExecutionService.to_schema(order, risk_checks.get(order.risk_check_id)) for order in orders]

    @staticmethod
    def to_schema(order: PaperOrder, risk_check: RiskCheck | None = None) -> dict:
        risk_summary = None
        if risk_check:
            risk_summary = {
                "id": risk_check.id,
                "hypothesis_id": risk_check.hypothesis_id,
                "status": risk_check.decision,
                "decision": risk_check.decision,
                "risk_level": risk_check.risk_level,
                "risk_score": risk_check.risk_score,
                "max_loss": risk_check.max_loss,
                "reward_risk": risk_check.reward_risk,
                "position_size": risk_check.position_size,
                "blocks": risk_check.block_reasons_json or [],
                "warnings": risk_check.warnings_json or [],
                "market_data_status": risk_check.market_data_status,
            }
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
            "risk_check": risk_summary,
            "created_at": order.created_at,
            "is_mock": order.is_mock,
            "source": order.source,
        }
