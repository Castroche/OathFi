from __future__ import annotations

from datetime import timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import risk_blocked_error
from app.db.base import now_utc, prefixed_id
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.paper_order import PaperAccount, PaperExecutionLog, PaperFill, PaperOrder, PaperPosition
from app.models.risk_check import RiskCheck
from app.providers.market import MarketProviderError
from app.schemas.paper_order import PaperOrderCreateRequest
from app.services.execution_adapters import PaperExecutionAdapter
from app.services.market_data_service import MarketDataService
from app.services.workflow_service import log_action, new_workflow_id


def envelope_error(status_code: int, code: str, message: str, details: dict | None = None) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        },
    )


class PaperExecutionService:
    max_risk_check_age_seconds = 60
    max_execution_price_deviation = 0.003

    def __init__(self) -> None:
        self.market_data = MarketDataService()
        self.execution_adapter = PaperExecutionAdapter()

    def create_order(self, db: Session, request: PaperOrderCreateRequest) -> dict:
        if not request.risk_check_id:
            raise envelope_error(
                status.HTTP_400_BAD_REQUEST,
                "RISK_CHECK_REQUIRED",
                "A stored risk check is required before paper order creation.",
                {"risk_check_id": request.risk_check_id},
            )
        risk_check = db.scalar(select(RiskCheck).where(RiskCheck.id == request.risk_check_id))
        if risk_check is None:
            raise envelope_error(
                status.HTTP_400_BAD_REQUEST,
                "RISK_CHECK_REQUIRED",
                "A stored risk check is required before paper order creation.",
                {"risk_check_id": request.risk_check_id},
            )
        hypothesis = self._require_hypothesis(db, request.hypothesis_id)
        self._validate_order_contract(
            risk_check=risk_check,
            hypothesis=hypothesis,
            request_hypothesis_id=request.hypothesis_id,
            request_backtest_id=request.backtest_id,
            order_side=request.side,
            require_fresh=True,
        )

        workflow_id = risk_check.workflow_id or new_workflow_id()
        entry_price = risk_check.entry_price if risk_check.entry_price is not None else request.price
        quantity = risk_check.position_size if risk_check.position_size is not None else request.quantity
        order = PaperOrder(
            id=prefixed_id("po"),
            workflow_id=workflow_id,
            hypothesis_id=request.hypothesis_id,
            backtest_id=request.backtest_id,
            risk_check_id=request.risk_check_id,
            symbol=request.symbol,
            side=request.side,
            order_type=request.order_type,
            price=entry_price,
            quantity=quantity,
            stop_loss=risk_check.stop_loss if risk_check.stop_loss is not None else request.stop_loss,
            take_profit=risk_check.take_profit if risk_check.take_profit is not None else request.take_profit,
            position_size=quantity,
            risk_amount=risk_check.max_loss,
            mode=request.mode or "paper",
            risk_status=risk_check.decision,
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
        self._write_execution_log(
            db,
            order,
            "ORDER_DRAFTED",
            "draft",
            "Created paper order draft from approved Risk Firewall check.",
            {"risk_status": risk_check.decision},
        )
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
        return self.to_schema(db, order, risk_check)

    def execute_order(self, db: Session, paper_order_id: str) -> dict:
        order = db.get(PaperOrder, paper_order_id)
        if order is None:
            raise envelope_error(status.HTTP_404_NOT_FOUND, "PAPER_ORDER_NOT_FOUND", "Paper order not found.", {"paper_order_id": paper_order_id})
        if order.status != "draft":
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "INVALID_ORDER_STATUS",
                "Only draft paper orders can be executed.",
                {"paper_order_id": paper_order_id, "status": order.status},
            )
        risk_check = self._require_risk_check(db, order)
        hypothesis = self._require_hypothesis(db, order.hypothesis_id)
        try:
            self._validate_order_contract(
                risk_check=risk_check,
                hypothesis=hypothesis,
                request_hypothesis_id=order.hypothesis_id,
                request_backtest_id=order.backtest_id,
                order_side=order.side,
                require_fresh=True,
            )
        except HTTPException as exc:
            self._write_execution_log(
                db,
                order,
                "RISK_BLOCK",
                "rejected",
                "Risk decision blocks paper order execution.",
                {"risk_status": risk_check.decision, "error": exc.detail},
            )
            order.status = "rejected"
            order.error_message = "Risk decision blocks paper order execution."
            order.updated_at = now_utc()
            log_action(
                db,
                action_type="EXECUTE_PAPER_ORDER_BLOCKED",
                entity_type="paper_order",
                entity_id=order.id,
                workflow_id=order.workflow_id,
                message="Risk decision blocked paper order execution.",
                payload={"risk_check_id": order.risk_check_id, "risk_status": risk_check.decision},
                source=order.source,
                status="blocked",
                is_mock=order.is_mock,
            )
            db.commit()
            raise exc

        try:
            market = self._market_execution_estimate(order.symbol)
        except MarketProviderError as exc:
            self._write_execution_log(
                db,
                order,
                "MARKET_SOURCE_UNAVAILABLE",
                "rejected",
                "HTX ticker/orderbook was unavailable during paper execution.",
                {"error": str(exc)},
            )
            order.error_message = str(exc)
            order.updated_at = now_utc()
            log_action(
                db,
                action_type="EXECUTE_PAPER_ORDER_FAILED",
                entity_type="paper_order",
                entity_id=order.id,
                workflow_id=order.workflow_id,
                message="HTX ticker unavailable during paper execution.",
                payload={"risk_check_id": order.risk_check_id, "error": str(exc)},
                source=order.source,
                status="failed",
                is_mock=order.is_mock,
            )
            db.commit()
            raise envelope_error(status.HTTP_503_SERVICE_UNAVAILABLE, "MARKET_SOURCE_UNAVAILABLE", str(exc), {"source": "htx"})

        mark_price = market["mark_price"]
        deviation = abs(mark_price - risk_check.entry_price) / risk_check.entry_price if risk_check.entry_price else 1.0
        if deviation > self.max_execution_price_deviation:
            self._write_execution_log(
                db,
                order,
                "PRICE_DEVIATION_BLOCK",
                "rejected",
                "Current market price deviates too far from the approved risk-check entry.",
                {"mark_price": mark_price, "risk_entry": risk_check.entry_price, "deviation": deviation},
            )
            order.status = "rejected"
            order.error_message = "Current market price deviates too far from the approved risk-check entry."
            order.updated_at = now_utc()
            db.commit()
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "RISK_CHECK_STALE",
                "Current market price deviates too far from the approved risk-check entry.",
                {"mark_price": mark_price, "risk_entry": risk_check.entry_price, "deviation": deviation},
            )

        fill_decision = self.execution_adapter.evaluate_order(side=order.side, order_type=order.order_type, limit_price=order.price, mark_price=mark_price)
        should_fill = fill_decision.should_fill
        submitted_at = now_utc()
        order.submitted_at = submitted_at
        order.updated_at = submitted_at
        order.risk_status = risk_check.decision

        if should_fill:
            order.status = "filled"
            order.filled_at = submitted_at
            fill_price = fill_decision.fill_price or mark_price
            fill = self._create_fill(db, order, fill_price, risk_check.entry_price)
            self._create_position(db, order, fill_price)
            db.flush()
            self._refresh_account(db)
            self._write_execution_log(
                db,
                order,
                "FILL",
                "filled",
                "Paper order filled in the internal simulator. No exchange order was sent.",
                {"fill_id": fill.id, "mark_price": mark_price, "fill_price": fill_price, "market_source": market["source"], "adapter": self.execution_adapter.name},
            )
        else:
            order.status = "open"
            self._write_execution_log(
                db,
                order,
                "EXECUTE",
                "open",
                "Paper limit order is open in the internal simulator. No exchange order was sent.",
                {"mark_price": mark_price, "limit_price": order.price, "market_source": market["source"], "adapter": self.execution_adapter.name, "reason": fill_decision.reason},
            )

        log_action(
            db,
            action_type="EXECUTE_PAPER_ORDER",
            entity_type="paper_order",
            entity_id=order.id,
            workflow_id=order.workflow_id,
            message=f"Executed paper order in simulator with status {order.status}.",
            payload={"risk_check_id": order.risk_check_id, "status": order.status, "mark_price": mark_price, "is_real_trade": False},
            source=order.source,
            status="completed",
            is_mock=order.is_mock,
        )
        db.commit()
        db.refresh(order)
        return self.to_schema(db, order, risk_check)

    def cancel_order(self, db: Session, paper_order_id: str) -> dict:
        order = db.get(PaperOrder, paper_order_id)
        if order is None:
            raise envelope_error(status.HTTP_404_NOT_FOUND, "PAPER_ORDER_NOT_FOUND", "Paper order not found.", {"paper_order_id": paper_order_id})
        if order.status == "cancelled":
            return self.to_schema(db, order)
        if order.status not in {"draft", "open"}:
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "ORDER_NOT_CANCELABLE",
                "Only draft or open paper orders can be cancelled.",
                {"paper_order_id": paper_order_id, "status": order.status},
            )
        order.status = "cancelled"
        order.cancelled_at = now_utc()
        order.updated_at = order.cancelled_at
        self._write_execution_log(db, order, "CANCEL", "cancelled", "Paper order cancelled in the internal simulator.", {})
        log_action(
            db,
            action_type="CANCEL_PAPER_ORDER",
            entity_type="paper_order",
            entity_id=order.id,
            workflow_id=order.workflow_id,
            message="Cancelled paper order in simulator.",
            payload={"risk_check_id": order.risk_check_id, "is_real_trade": False},
            source=order.source,
            status="completed",
            is_mock=order.is_mock,
        )
        db.commit()
        db.refresh(order)
        return self.to_schema(db, order)

    def get(self, db: Session, paper_order_id: str) -> dict | None:
        order = db.get(PaperOrder, paper_order_id)
        return self.to_schema(db, order) if order else None

    def get_account(self, db: Session) -> dict:
        self._refresh_open_positions(db)
        account = self._refresh_account(db)
        db.commit()
        return self.account_to_schema(account)

    def list(self, db: Session, limit: int = 50, status_filter: str | None = None, symbol: str | None = None, hypothesis_id: str | None = None) -> list[dict]:
        stmt = select(PaperOrder).order_by(PaperOrder.created_at.desc()).limit(limit)
        if status_filter:
            stmt = stmt.where(PaperOrder.status == status_filter)
        if symbol:
            stmt = stmt.where(PaperOrder.symbol == symbol)
        if hypothesis_id:
            stmt = stmt.where(PaperOrder.hypothesis_id == hypothesis_id)
        orders = list(db.scalars(stmt))
        return [PaperExecutionService.to_schema(db, order) for order in orders]

    def list_positions(self, db: Session, status_filter: str | None = "open") -> list[dict]:
        self._refresh_open_positions(db)
        self._refresh_account(db)
        db.commit()
        stmt = select(PaperPosition).order_by(PaperPosition.created_at.desc())
        if status_filter:
            stmt = stmt.where(PaperPosition.status == status_filter)
        return [PaperExecutionService.position_to_schema(position) for position in db.scalars(stmt)]

    @staticmethod
    def list_logs(db: Session, limit: int = 100, paper_order_id: str | None = None, hypothesis_id: str | None = None) -> list[dict]:
        stmt = select(PaperExecutionLog).order_by(PaperExecutionLog.created_at.desc()).limit(limit)
        if paper_order_id:
            stmt = stmt.where(PaperExecutionLog.paper_order_id == paper_order_id)
        if hypothesis_id:
            stmt = stmt.where(PaperExecutionLog.hypothesis_id == hypothesis_id)
        return [PaperExecutionService.log_to_schema(log) for log in db.scalars(stmt)]

    @staticmethod
    def to_schema(db: Session, order: PaperOrder, risk_check: RiskCheck | None = None) -> dict:
        risk_check = risk_check if risk_check is not None else (db.get(RiskCheck, order.risk_check_id) if order.risk_check_id else None)
        hypothesis = db.get(Hypothesis, order.hypothesis_id) if order.hypothesis_id else None
        backtest = db.get(BacktestResult, order.backtest_id) if order.backtest_id else None
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
            "position_size": order.position_size,
            "risk_amount": order.risk_amount,
            "mode": order.mode,
            "risk_status": order.risk_status,
            "is_real_trade": order.is_real_trade,
            "execution_mode": order.execution_mode,
            "risk_check": PaperExecutionService.risk_to_summary(risk_check),
            "hypothesis": PaperExecutionService.hypothesis_to_summary(hypothesis),
            "backtest_result": PaperExecutionService.backtest_to_summary(backtest),
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "submitted_at": order.submitted_at,
            "filled_at": order.filled_at,
            "cancelled_at": order.cancelled_at,
            "is_mock": order.is_mock,
            "source": order.source,
        }

    @staticmethod
    def risk_to_summary(risk_check: RiskCheck | None) -> dict | None:
        if risk_check is None:
            return None
        return {
            "id": risk_check.id,
            "hypothesis_id": risk_check.hypothesis_id,
            "backtest_id": risk_check.backtest_id,
            "status": risk_check.decision,
            "decision": risk_check.decision,
            "risk_level": risk_check.risk_level,
            "risk_score": risk_check.risk_score,
            "max_loss": risk_check.max_loss,
            "reward_risk": risk_check.reward_risk,
            "position_size": risk_check.position_size,
            "entry_price": risk_check.entry_price,
            "stop_loss": risk_check.stop_loss,
            "take_profit": risk_check.take_profit,
            "blocks": risk_check.block_reasons_json or [],
            "block_reasons": risk_check.block_reasons_json or [],
            "warnings": risk_check.warnings_json or [],
            "market_data_status": risk_check.market_data_status,
        }

    @staticmethod
    def hypothesis_to_summary(hypothesis: Hypothesis | None) -> dict | None:
        if hypothesis is None:
            return None
        return {
            "id": hypothesis.id,
            "strategy": hypothesis.label or hypothesis.hypothesis_type or "unavailable",
            "direction": hypothesis.direction,
            "time_horizon": hypothesis.timeframe,
            "market": hypothesis.symbol,
            "model_confidence": hypothesis.confidence,
            "setup_quality": hypothesis.feasibility,
            "summary": hypothesis.summary,
        }

    @staticmethod
    def backtest_to_summary(backtest: BacktestResult | None) -> dict | None:
        if backtest is None:
            return None
        verdict = "favorable" if backtest.expectancy > 0 and backtest.profit_factor >= 1 else "weak"
        return {
            "id": backtest.id,
            "status": backtest.status,
            "verdict": verdict,
            "expectancy": backtest.expectancy,
            "profit_factor": backtest.profit_factor,
            "max_drawdown": backtest.max_drawdown,
            "trade_count": backtest.trade_count,
            "sample_quality": backtest.sample_quality,
        }

    @staticmethod
    def account_to_schema(account: PaperAccount) -> dict:
        return {
            "id": account.id,
            "equity": account.equity,
            "available_balance": account.available_balance,
            "used_margin": account.used_margin,
            "unrealized_pnl": account.unrealized_pnl,
            "realized_pnl": account.realized_pnl,
            "daily_loss": account.daily_loss,
            "max_daily_loss": account.max_daily_loss,
            "risk_utilization": account.risk_utilization,
        }

    @staticmethod
    def position_to_schema(position: PaperPosition) -> dict:
        return {
            "id": position.id,
            "symbol": position.symbol,
            "side": position.side,
            "quantity": position.quantity,
            "entry_price": position.entry_price,
            "mark_price": position.mark_price,
            "unrealized_pnl": position.unrealized_pnl,
            "stop_loss": position.stop_loss,
            "take_profit": position.take_profit,
            "risk_check_id": position.risk_check_id,
            "hypothesis_id": position.hypothesis_id,
            "status": position.status,
        }

    @staticmethod
    def log_to_schema(log: PaperExecutionLog) -> dict:
        return {
            "id": log.id,
            "paper_order_id": log.paper_order_id,
            "hypothesis_id": log.hypothesis_id,
            "risk_check_id": log.risk_check_id,
            "event_type": log.event_type,
            "status": log.status,
            "message": log.message,
            "metadata_json": log.metadata_json or {},
            "created_at": log.created_at,
        }

    @staticmethod
    def _risk_blocks(risk_check: RiskCheck) -> bool:
        return str(risk_check.decision).upper() != "APPROVED"

    @staticmethod
    def _require_risk_check(db: Session, order: PaperOrder) -> RiskCheck:
        if not order.risk_check_id:
            raise envelope_error(
                status.HTTP_400_BAD_REQUEST,
                "RISK_CHECK_REQUIRED",
                "A stored risk check is required before paper order execution.",
                {"paper_order_id": order.id, "risk_check_id": order.risk_check_id},
            )
        risk_check = db.get(RiskCheck, order.risk_check_id)
        if risk_check is None:
            raise envelope_error(
                status.HTTP_400_BAD_REQUEST,
                "RISK_CHECK_REQUIRED",
                "The linked risk check is missing.",
                {"paper_order_id": order.id, "risk_check_id": order.risk_check_id},
            )
        return risk_check

    @staticmethod
    def _require_hypothesis(db: Session, hypothesis_id: str) -> Hypothesis:
        hypothesis = db.get(Hypothesis, hypothesis_id)
        if hypothesis is None:
            raise envelope_error(
                status.HTTP_400_BAD_REQUEST,
                "HYPOTHESIS_NOT_FOUND",
                "A stored hypothesis is required before paper order creation.",
                {"hypothesis_id": hypothesis_id},
            )
        return hypothesis

    def _validate_order_contract(
        self,
        *,
        risk_check: RiskCheck,
        hypothesis: Hypothesis,
        request_hypothesis_id: str,
        request_backtest_id: str | None,
        order_side: str,
        require_fresh: bool,
    ) -> None:
        if str(risk_check.decision).upper() != "APPROVED":
            raise risk_blocked_error(risk_check.id)
        if risk_check.market_data_status != "live":
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "MARKET_DATA_NOT_LIVE",
                "Live market data is required for paper order creation and execution.",
                {"risk_check_id": risk_check.id, "market_data_status": risk_check.market_data_status},
            )
        if risk_check.hypothesis_id != request_hypothesis_id or risk_check.hypothesis_id != hypothesis.id:
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "WORKFLOW_LINK_MISMATCH",
                "Risk check and hypothesis IDs do not match.",
                {"risk_check_id": risk_check.id, "risk_hypothesis_id": risk_check.hypothesis_id, "request_hypothesis_id": request_hypothesis_id},
            )
        if risk_check.backtest_id and request_backtest_id and risk_check.backtest_id != request_backtest_id:
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "WORKFLOW_LINK_MISMATCH",
                "Risk check and backtest IDs do not match.",
                {"risk_check_id": risk_check.id, "risk_backtest_id": risk_check.backtest_id, "request_backtest_id": request_backtest_id},
            )
        if hypothesis.direction not in {"long", "short"}:
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "HYPOTHESIS_NOT_TRADEABLE",
                "Only long or short hypotheses can create paper orders.",
                {"hypothesis_id": hypothesis.id, "direction": hypothesis.direction},
            )
        expected_side = "buy" if hypothesis.direction == "long" else "sell"
        if str(order_side).lower() != expected_side:
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "ORDER_SIDE_MISMATCH",
                "Paper order side must match the approved hypothesis direction.",
                {"hypothesis_id": hypothesis.id, "direction": hypothesis.direction, "expected_side": expected_side, "order_side": order_side},
            )
        if require_fresh and self._risk_check_age_seconds(risk_check) > self.max_risk_check_age_seconds:
            raise envelope_error(
                status.HTTP_409_CONFLICT,
                "RISK_CHECK_STALE",
                "Risk check is stale. Run a fresh risk check before paper execution.",
                {"risk_check_id": risk_check.id, "max_age_seconds": self.max_risk_check_age_seconds},
            )

    @staticmethod
    def _risk_check_age_seconds(risk_check: RiskCheck) -> float:
        created_at = risk_check.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return (now_utc() - created_at).total_seconds()

    def _market_execution_estimate(self, symbol: str) -> dict:
        ticker = self.market_data.get_ticker(symbol)
        orderbook = self.market_data.get_orderbook(symbol, depth=20)
        if ticker.get("status") not in {None, "live", "ok"} or ticker.get("is_mock"):
            raise MarketProviderError("Ticker is not live.")
        if orderbook.get("status") not in {None, "live", "ok"} or orderbook.get("is_mock"):
            raise MarketProviderError("Orderbook is not live.")
        mark_price = float(orderbook.get("mid_price") or ticker.get("price") or ticker.get("last") or 0)
        if mark_price <= 0:
            raise MarketProviderError("No valid mark price is available.")
        return {
            "mark_price": mark_price,
            "ticker": ticker,
            "orderbook": orderbook,
            "source": f"{ticker.get('source', 'ticker')}+{orderbook.get('source', 'orderbook')}",
        }

    @staticmethod
    def _get_or_create_account(db: Session) -> PaperAccount:
        account = db.get(PaperAccount, "paper_default")
        if account is None:
            account = PaperAccount(id="paper_default", created_at=now_utc(), updated_at=now_utc())
            db.add(account)
            db.flush()
        return account

    def _refresh_account(self, db: Session) -> PaperAccount:
        account = self._get_or_create_account(db)
        positions = list(db.scalars(select(PaperPosition).where(PaperPosition.status == "open")))
        account.used_margin = round(sum(position.entry_price * position.quantity for position in positions), 8)
        account.unrealized_pnl = round(sum(position.unrealized_pnl for position in positions), 8)
        account.risk_utilization = round(account.used_margin / account.equity, 8) if account.equity else 0.0
        account.available_balance = round(max(0.0, account.equity - account.used_margin), 8)
        account.updated_at = now_utc()
        return account

    def _refresh_open_positions(self, db: Session) -> None:
        positions = list(db.scalars(select(PaperPosition).where(PaperPosition.status == "open")))
        if not positions:
            return
        account = self._get_or_create_account(db)
        for position in positions:
            try:
                market = self._market_execution_estimate(position.symbol)
            except MarketProviderError:
                continue
            mark_price = market["mark_price"]
            side = (position.side or "").lower()
            is_long = side in {"buy", "long"}
            pnl = (mark_price - position.entry_price) * position.quantity if is_long else (position.entry_price - mark_price) * position.quantity
            position.mark_price = mark_price
            position.unrealized_pnl = round(pnl, 8)
            position.updated_at = now_utc()
            exit_reason = None
            if is_long:
                if position.stop_loss is not None and mark_price <= position.stop_loss:
                    exit_reason = "stop_loss"
                elif position.take_profit is not None and mark_price >= position.take_profit:
                    exit_reason = "take_profit"
            else:
                if position.stop_loss is not None and mark_price >= position.stop_loss:
                    exit_reason = "stop_loss"
                elif position.take_profit is not None and mark_price <= position.take_profit:
                    exit_reason = "take_profit"
            if exit_reason:
                position.status = "closed"
                account.realized_pnl = round(account.realized_pnl + pnl, 8)
                account.equity = round(account.equity + pnl, 8)
                account.daily_loss = round(account.daily_loss + abs(min(pnl, 0)), 8)
                position.unrealized_pnl = 0.0
                self._write_position_log(
                    db,
                    position,
                    "POSITION_AUTO_CLOSE",
                    "closed",
                    "Paper position auto-closed by stop-loss/take-profit refresh.",
                    {"exit_reason": exit_reason, "mark_price": mark_price, "realized_pnl": round(pnl, 8), "market_source": market["source"]},
                )

    @staticmethod
    def _create_fill(db: Session, order: PaperOrder, fill_price: float, approved_entry: float) -> PaperFill:
        notional = fill_price * order.quantity
        fill = PaperFill(
            id=prefixed_id("fill"),
            paper_order_id=order.id,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            fill_price=fill_price,
            fee=round(notional * 0.0004, 8),
            slippage=round(abs(fill_price - approved_entry) * order.quantity, 8),
            liquidity_type="simulated",
            created_at=now_utc(),
        )
        db.add(fill)
        return fill

    @staticmethod
    def _create_position(db: Session, order: PaperOrder, mark_price: float) -> PaperPosition:
        position = PaperPosition(
            id=prefixed_id("pos"),
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            entry_price=mark_price,
            mark_price=mark_price,
            unrealized_pnl=0.0,
            stop_loss=order.stop_loss,
            take_profit=order.take_profit,
            risk_check_id=order.risk_check_id,
            hypothesis_id=order.hypothesis_id,
            status="open",
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(position)
        return position

    @staticmethod
    def _write_execution_log(db: Session, order: PaperOrder, event_type: str, status_value: str, message: str, metadata: dict) -> None:
        db.add(
            PaperExecutionLog(
                id=prefixed_id("elog"),
                paper_order_id=order.id,
                hypothesis_id=order.hypothesis_id,
                risk_check_id=order.risk_check_id,
                event_type=event_type,
                status=status_value,
                message=message,
                metadata_json=metadata,
                created_at=now_utc(),
            )
        )

    @staticmethod
    def _write_position_log(db: Session, position: PaperPosition, event_type: str, status_value: str, message: str, metadata: dict) -> None:
        db.add(
            PaperExecutionLog(
                id=prefixed_id("elog"),
                paper_order_id=None,
                hypothesis_id=position.hypothesis_id,
                risk_check_id=position.risk_check_id,
                event_type=event_type,
                status=status_value,
                message=message,
                metadata_json={**metadata, "position_id": position.id},
                created_at=now_utc(),
            )
        )
