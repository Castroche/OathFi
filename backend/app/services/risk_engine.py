from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.risk_check import RiskCheck
from app.schemas.risk import RiskCheckRequest
from app.services.market_data_service import MarketDataService
from app.services.workflow_service import log_action, new_workflow_id


class RiskEngine:
    hard_block_keywords = ("exploit", "hack", "depeg", "insolvent", "halted", "security incident")

    def __init__(self) -> None:
        self.market_data = MarketDataService()

    def check(self, db: Session, request: RiskCheckRequest) -> dict:
        hypothesis = db.get(Hypothesis, request.hypothesis_id)
        backtest = db.get(BacktestResult, request.backtest_id) if request.backtest_id else None
        workflow_id = (
            hypothesis.workflow_id
            if hypothesis
            else backtest.workflow_id
            if backtest
            else new_workflow_id()
        )
        symbol = hypothesis.symbol if hypothesis else "ETH/USDT"
        orderbook = self.market_data.get_orderbook(symbol, depth=20)
        klines = self.market_data.get_klines(symbol, "15m", limit=80).get("klines", [])
        checks, warnings, block_reasons = self._evaluate(request, hypothesis, backtest, orderbook, klines)
        if block_reasons or any(check["status"] == "BLOCK" for check in checks):
            decision = "BLOCK"
        elif warnings or any(check["status"] == "WARNING" for check in checks):
            decision = "WARNING"
        else:
            decision = "PASS"
        risk_check = RiskCheck(
            id=prefixed_id("risk"),
            workflow_id=workflow_id,
            hypothesis_id=request.hypothesis_id,
            backtest_id=request.backtest_id,
            decision=decision,
            account_equity=request.account_equity,
            risk_per_trade=request.risk_per_trade,
            position_size=request.position_size,
            entry_price=request.entry_price,
            stop_loss=request.stop_loss,
            take_profit=request.take_profit,
            checks_json=checks,
            warnings_json=warnings,
            block_reasons_json=block_reasons,
            source=orderbook.get("source", "unavailable"),
            status="completed",
            is_mock=bool(orderbook.get("is_mock", True)),
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(risk_check)
        log_action(
            db,
            action_type="RUN_RISK_CHECK",
            entity_type="risk_check",
            entity_id=risk_check.id,
            workflow_id=workflow_id,
            message="Stored demo risk check.",
            payload={"decision": decision, "checks": checks, "warnings": warnings, "block_reasons": block_reasons},
            source=risk_check.source,
            status="completed",
            is_mock=risk_check.is_mock,
        )
        db.commit()
        db.refresh(risk_check)
        return self.to_schema(risk_check)

    def get(self, db: Session, risk_check_id: str) -> dict | None:
        risk_check = db.get(RiskCheck, risk_check_id)
        return self.to_schema(risk_check) if risk_check else None

    @staticmethod
    def to_schema(risk_check: RiskCheck) -> dict:
        return {
            "id": risk_check.id,
            "workflow_id": risk_check.workflow_id,
            "hypothesis_id": risk_check.hypothesis_id,
            "backtest_id": risk_check.backtest_id,
            "decision": risk_check.decision,
            "checks": risk_check.checks_json,
            "warnings": risk_check.warnings_json,
            "block_reasons": risk_check.block_reasons_json,
            "created_at": risk_check.created_at,
            "is_mock": risk_check.is_mock,
            "source": risk_check.source,
            "status": risk_check.status,
        }

    @staticmethod
    def list(db: Session, limit: int = 50) -> list[dict]:
        stmt = select(RiskCheck).order_by(RiskCheck.created_at.desc()).limit(limit)
        return [RiskEngine.to_schema(risk_check) for risk_check in db.scalars(stmt)]

    def _evaluate(
        self,
        request: RiskCheckRequest,
        hypothesis: Hypothesis | None,
        backtest: BacktestResult | None,
        orderbook: dict,
        klines: list[dict],
    ) -> tuple[list[dict], list[str], list[str]]:
        warnings: list[str] = []
        block_reasons: list[str] = []
        checks: list[dict] = []
        stop_distance = abs(request.entry_price - request.stop_loss)
        reward_distance = abs((request.take_profit or request.entry_price) - request.entry_price)
        max_loss = stop_distance * request.position_size
        max_allowed_loss = request.account_equity * request.risk_per_trade
        rr = reward_distance / stop_distance if stop_distance > 0 else 0
        orderbook_depth = sum(float(row.get("total", row.get("size", 0))) for row in orderbook.get("bids", [])[:10])
        spread = float(orderbook.get("spread") or 0)
        volatility = _estimate_volatility(klines)
        text = " ".join(
            [
                hypothesis.summary if hypothesis else "",
                " ".join(hypothesis.warnings_json or []) if hypothesis else "",
                " ".join(hypothesis.reasons_json or []) if hypothesis else "",
            ]
        ).lower()
        hard_hits = [keyword for keyword in self.hard_block_keywords if keyword in text]

        def add(name: str, status: str, message: str) -> None:
            checks.append({"name": name, "status": status, "message": message})
            if status == "WARNING":
                warnings.append(message)
            if status == "BLOCK":
                block_reasons.append(message)

        add(
            "position_size",
            "PASS" if request.position_size <= 1.5 else "WARNING" if request.position_size <= 3 else "BLOCK",
            f"Position size {request.position_size:.4g} is checked against demo paper limits.",
        )
        add(
            "risk_per_trade",
            "PASS" if request.risk_per_trade <= 0.015 else "WARNING" if request.risk_per_trade <= 0.025 else "BLOCK",
            f"Risk per trade is {request.risk_per_trade:.2%}; demo target is <= 1.5%.",
        )
        add(
            "stop_loss_distance",
            "BLOCK" if stop_distance <= 0 else "WARNING" if stop_distance / request.entry_price < 0.003 else "PASS",
            f"Stop distance is {stop_distance:.4g}, {stop_distance / request.entry_price:.2%} from entry.",
        )
        add(
            "max_loss",
            "PASS" if max_loss <= max_allowed_loss else "WARNING" if max_loss <= max_allowed_loss * 1.5 else "BLOCK",
            f"Estimated max loss {max_loss:.2f} vs allowed {max_allowed_loss:.2f}.",
        )
        add(
            "risk_reward",
            "PASS" if rr >= 1.6 else "WARNING" if rr >= 1 else "BLOCK",
            f"Risk/reward is {rr:.2f}.",
        )
        add(
            "slippage",
            "PASS" if spread / request.entry_price <= 0.002 else "WARNING" if spread / request.entry_price <= 0.006 else "BLOCK",
            f"Current spread implies {(spread / request.entry_price):.2%} entry friction.",
        )
        add(
            "orderbook_depth",
            "PASS" if orderbook_depth >= request.position_size * 3 else "WARNING" if orderbook_depth >= request.position_size else "BLOCK",
            f"Top-of-book depth {orderbook_depth:.4g} vs quantity {request.position_size:.4g}.",
        )
        add(
            "volatility",
            "PASS" if volatility <= 0.025 else "WARNING" if volatility <= 0.05 else "BLOCK",
            f"Sample volatility is {volatility:.2%}.",
        )
        backtest_quality = backtest.sample_quality if backtest else "missing"
        add(
            "hard_block_keywords",
            "BLOCK" if hard_hits else "PASS",
            f"Hard block keyword scan: {', '.join(hard_hits) if hard_hits else 'none'}; backtest sample {backtest_quality}.",
        )
        if backtest and backtest.profit_factor < 1:
            warnings.append(f"Backtest profit factor {backtest.profit_factor:.2f} is below 1.0.")
        return checks, list(dict.fromkeys(warnings)), list(dict.fromkeys(block_reasons))


def _estimate_volatility(klines: list[dict]) -> float:
    if len(klines) < 2:
        return 0.0
    moves = []
    for previous, current in zip(klines, klines[1:]):
        previous_close = float(previous.get("close") or 0)
        current_close = float(current.get("close") or 0)
        if previous_close:
            moves.append(abs(current_close - previous_close) / previous_close)
    return sum(moves) / len(moves) if moves else 0.0
