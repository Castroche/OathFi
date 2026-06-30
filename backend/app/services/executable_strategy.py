from __future__ import annotations

from dataclasses import dataclass
from typing import Any


MIN_REWARD_RISK = 1.2


@dataclass(frozen=True)
class StrategyValidation:
    valid: bool
    reasons: list[str]
    side: str
    entry_price: float | None
    stop_loss: float | None
    take_profit: float | None
    reward_risk: float


def strategy_from_hypothesis(hypothesis: Any) -> dict[str, Any] | None:
    raw = getattr(hypothesis, "raw_json", None) if hypothesis is not None else None
    structured = raw.get("structured_hypothesis") if isinstance(raw, dict) and isinstance(raw.get("structured_hypothesis"), dict) else {}
    executable = structured.get("executable_strategy") if isinstance(structured.get("executable_strategy"), dict) else None
    if executable:
        return executable
    suggested = getattr(hypothesis, "suggested_rule_json", None) if hypothesis is not None else None
    if isinstance(suggested, dict) and isinstance(suggested.get("executable_strategy"), dict):
        return suggested["executable_strategy"]
    return None


def build_executable_strategy(
    *,
    direction: str,
    entry_type: str,
    trigger_price: float | None,
    stop_loss: float | None,
    take_profit_1: float | None,
    take_profit_2: float | None = None,
    expected_rr: float | str | None = None,
    risk_per_trade: float = 0.01,
    max_position_notional_pct: float = 1.0,
) -> dict[str, Any]:
    side = direction if direction in {"long", "short"} else "no_trade"
    operator = ">=" if side == "long" else "<=" if side == "short" else None
    confirmations = []
    if side == "long":
        confirmations = [
            {"field": "rsi14", "operator": ">=", "value": 52},
            {"field": "spread_ratio", "operator": "<=", "value": 0.002},
        ]
    elif side == "short":
        confirmations = [
            {"field": "rsi14", "operator": "<=", "value": 48},
            {"field": "spread_ratio", "operator": "<=", "value": 0.002},
        ]
    return {
        "side": side,
        "entry": {
            "type": _entry_type(entry_type, side),
            "operator": operator,
            "price": _number_or_none(trigger_price),
            "confirmations": confirmations,
        },
        "exit": {
            "stop_loss": _number_or_none(stop_loss),
            "take_profit_1": _number_or_none(take_profit_1),
            "take_profit_2": _number_or_none(take_profit_2),
            "time_stop_bars": 24,
        },
        "risk": {
            "risk_per_trade": risk_per_trade,
            "max_position_notional_pct": max_position_notional_pct,
        },
        "expected_rr": _number_or_none(expected_rr),
    }


def validate_executable_strategy(
    strategy: dict[str, Any] | None,
    *,
    hypothesis_direction: str | None = None,
    min_reward_risk: float = MIN_REWARD_RISK,
) -> StrategyValidation:
    reasons: list[str] = []
    if not isinstance(strategy, dict):
        return StrategyValidation(False, ["executable_strategy_missing"], "no_trade", None, None, None, 0.0)

    side = str(strategy.get("side") or "no_trade").lower()
    if hypothesis_direction in {"no_trade", "neutral"} or side in {"no_trade", "neutral"}:
        reasons.append("hypothesis_not_tradeable")
        return StrategyValidation(False, reasons, "no_trade", None, None, None, 0.0)
    if side not in {"long", "short"}:
        reasons.append("executable_strategy_invalid_side")

    entry = strategy.get("entry") if isinstance(strategy.get("entry"), dict) else {}
    exit_plan = strategy.get("exit") if isinstance(strategy.get("exit"), dict) else {}
    entry_price = _float_or_none(entry.get("price"))
    stop_loss = _float_or_none(exit_plan.get("stop_loss"))
    take_profit = _float_or_none(exit_plan.get("take_profit_1"))
    if entry_price is None or stop_loss is None or take_profit is None:
        reasons.append("executable_strategy_missing_prices")

    reward_risk = _reward_risk(side, entry_price, stop_loss, take_profit)
    if entry_price is not None and stop_loss is not None and take_profit is not None:
        if side == "long" and not (stop_loss < entry_price < take_profit):
            reasons.append("side_price_consistency")
        if side == "short" and not (stop_loss > entry_price > take_profit):
            reasons.append("side_price_consistency")
        if reward_risk < min_reward_risk:
            reasons.append("risk_reward_minimum")

    return StrategyValidation(not reasons, reasons, side, entry_price, stop_loss, take_profit, reward_risk)


def no_trade_strategy(reason: str = "invalid_structure") -> dict[str, Any]:
    return {
        "side": "no_trade",
        "entry": {"type": "market", "operator": None, "price": None, "confirmations": []},
        "exit": {"stop_loss": None, "take_profit_1": None, "take_profit_2": None, "time_stop_bars": None},
        "risk": {"risk_per_trade": 0.0, "max_position_notional_pct": 0.0},
        "expected_rr": None,
        "invalid_reason": reason,
    }


def _entry_type(value: str | None, side: str) -> str:
    text = str(value or "").lower()
    allowed = {"market", "limit", "breakout", "breakdown", "pullback"}
    if text in allowed:
        return text
    if side == "long":
        return "breakout"
    if side == "short":
        return "breakdown"
    return "market"


def _number_or_none(value: Any) -> float | None:
    parsed = _float_or_none(value)
    return parsed if parsed is not None and parsed > 0 else None


def _float_or_none(value: Any) -> float | None:
    try:
        if value is None:
            return None
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _reward_risk(side: str, entry_price: float | None, stop_loss: float | None, take_profit: float | None) -> float:
    if entry_price is None or stop_loss is None or take_profit is None:
        return 0.0
    if side == "short":
        risk = stop_loss - entry_price
        reward = entry_price - take_profit
    else:
        risk = entry_price - stop_loss
        reward = take_profit - entry_price
    if risk <= 0:
        return 0.0
    return max(0.0, reward / risk)
