from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ExecutionDecision:
    should_fill: bool
    fill_price: float | None
    reason: str


class ExecutionAdapter(Protocol):
    name: str
    is_real_trade: bool

    def evaluate_order(self, *, side: str, order_type: str, limit_price: float, mark_price: float) -> ExecutionDecision:
        ...


class PaperExecutionAdapter:
    name = "paper"
    is_real_trade = False

    def evaluate_order(self, *, side: str, order_type: str, limit_price: float, mark_price: float) -> ExecutionDecision:
        normalized_side = side.lower()
        normalized_type = order_type.lower()
        if normalized_type == "market":
            return ExecutionDecision(True, mark_price, "paper_market_fill")
        if normalized_side in {"buy", "long"} and mark_price <= limit_price:
            return ExecutionDecision(True, mark_price, "paper_limit_buy_fill")
        if normalized_side in {"sell", "short"} and mark_price >= limit_price:
            return ExecutionDecision(True, mark_price, "paper_limit_sell_fill")
        return ExecutionDecision(False, None, "paper_limit_waiting")


class LiveExecutionAdapter:
    name = "live"
    is_real_trade = False

    def evaluate_order(self, *, side: str, order_type: str, limit_price: float, mark_price: float) -> ExecutionDecision:
        raise RuntimeError("Live execution is intentionally disabled in this release.")
