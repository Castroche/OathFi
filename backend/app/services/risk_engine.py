from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from statistics import mean
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.risk_check import RiskCheck
from app.models.user_settings import UserSettings
from app.providers.market import MarketProviderError
from app.schemas.risk import RiskCheckRequest
from app.services.market_data_service import MarketDataService
from app.services.workflow_service import log_action, new_workflow_id


@dataclass(frozen=True)
class RiskSettings:
    account_equity: float
    risk_per_trade: float
    max_drawdown: float
    min_trade_count: int
    max_spread_ratio: float
    min_liquidity_score: float
    max_volatility_score: float
    max_btc_correlation: float
    min_stop_distance_ratio: float
    max_stop_distance_ratio: float
    daily_loss_limit: float
    daily_realized_loss: float
    live_trading_enabled: bool


class RiskEngine:
    hard_block_keywords = ("exploit", "hack", "depeg", "insolvent", "halted", "security incident")

    rule_definitions = [
        {
            "name": "expectancy_positive",
            "label": "Backtest Expectancy Positive",
            "threshold": "expectancy > 0",
            "source": "backtest_result",
        },
        {
            "name": "profit_factor",
            "label": "Profit Factor",
            "threshold": "profit_factor >= 1.2",
            "source": "backtest_result",
        },
        {
            "name": "max_drawdown",
            "label": "Max Drawdown Below Threshold",
            "threshold": "max_drawdown <= risk_setting.max_drawdown",
            "source": "backtest_result + settings",
        },
        {
            "name": "sample_size",
            "label": "Sample Size Sufficient",
            "threshold": "trade_count >= 50 or configured threshold",
            "source": "backtest_result + settings",
        },
        {
            "name": "spread",
            "label": "Spread Acceptable",
            "threshold": "spread <= 0.2%",
            "source": "market orderbook",
        },
        {
            "name": "liquidity",
            "label": "Liquidity Score",
            "threshold": "liquidity_score >= 60",
            "source": "market orderbook",
        },
        {
            "name": "volatility",
            "label": "Volatility Not Extreme",
            "threshold": "volatility_score <= 80",
            "source": "market kline",
        },
        {
            "name": "btc_correlation",
            "label": "BTC Correlation Risk",
            "threshold": "correlation_to_btc <= 0.70",
            "source": "symbol kline + BTC/USDT kline",
        },
        {
            "name": "resistance_distance",
            "label": "Resistance Not Nearby",
            "threshold": "nearest resistance >= 1.0% away",
            "source": "market kline",
        },
        {
            "name": "stop_loss_distance",
            "label": "Stop-Loss Distance Reasonable",
            "threshold": "configured min <= distance <= configured max",
            "source": "hypothesis + ticker",
        },
        {
            "name": "risk_per_trade",
            "label": "Risk Per Trade",
            "threshold": "risk_per_trade <= 1%",
            "source": "settings + paper account",
        },
        {
            "name": "daily_loss_limit",
            "label": "Daily Loss Limit Not Triggered",
            "threshold": "daily_realized_loss < daily_loss_limit",
            "source": "paper account",
        },
        {
            "name": "live_trading_disabled",
            "label": "Live Trading Disabled",
            "threshold": "live_trading_enabled = false",
            "source": "settings",
        },
        {
            "name": "market_data_available",
            "label": "Market Data Available",
            "threshold": "ticker, orderbook, and kline available",
            "source": "htx market provider",
        },
    ]

    def __init__(self) -> None:
        self.market_data = MarketDataService()

    def check(self, db: Session, request: RiskCheckRequest) -> dict:
        hypothesis = db.get(Hypothesis, request.hypothesis_id)
        if hypothesis is None:
            raise RiskInputError("HYPOTHESIS_NOT_FOUND", "Hypothesis not found.", {"hypothesis_id": request.hypothesis_id})
        backtest = db.get(BacktestResult, request.backtest_id) if request.backtest_id else self._latest_backtest(db, hypothesis.id)
        if request.backtest_id and backtest is None:
            raise RiskInputError("BACKTEST_NOT_FOUND", "Backtest result not found.", {"backtest_id": request.backtest_id})
        workflow_id = (
            hypothesis.workflow_id
            if hypothesis
            else backtest.workflow_id
            if backtest
            else new_workflow_id()
        )
        symbol = hypothesis.symbol if hypothesis else "ETH/USDT"
        timeframe = hypothesis.timeframe if hypothesis else "15m"
        settings = self._load_settings(db, request)

        market = self._market_snapshot(symbol, timeframe, request)

        evaluation = self._evaluate(
            request=request,
            settings=settings,
            hypothesis=hypothesis,
            backtest=backtest,
            ticker=market["ticker"],
            orderbook=market["orderbook"],
            klines=market["klines"],
            btc_klines=market["btc_klines"],
            market_data_status=market["status"],
        )
        risk_check = RiskCheck(
            id=prefixed_id("risk"),
            workflow_id=workflow_id,
            hypothesis_id=request.hypothesis_id,
            backtest_id=backtest.id if backtest else request.backtest_id,
            decision=evaluation["decision"],
            risk_level=evaluation["risk_level"],
            risk_score=evaluation["risk_score"],
            account_equity=evaluation["account_equity"],
            risk_per_trade=evaluation["risk_per_trade"],
            position_size=evaluation["position_size"],
            entry_price=evaluation["entry_price"],
            stop_loss=evaluation["stop_loss"],
            take_profit=evaluation["take_profit"],
            max_loss=evaluation["max_loss"],
            reward_risk=evaluation["reward_risk"],
            rule_results_json=evaluation["rule_results"],
            market_data_status=evaluation["market_data_status"],
            checks_json=evaluation["rule_results"],
            warnings_json=evaluation["warnings"],
            block_reasons_json=evaluation["block_reasons"],
            source="htx_rest+risk_engine" if market["status"] == "live" else "market_data_unavailable+risk_engine",
            status="completed",
            is_mock=bool(market["ticker"].get("is_mock") or market["orderbook"].get("is_mock")),
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(risk_check)
        hypothesis.latest_risk_check_id = risk_check.id
        hypothesis.updated_at = now_utc()
        log_action(
            db,
            action_type="RUN_RISK_CHECK",
            entity_type="risk_check",
            entity_id=risk_check.id,
            workflow_id=workflow_id,
            message="Stored calculated Risk Firewall decision.",
            payload={
                "decision": risk_check.decision,
                "risk_level": risk_check.risk_level,
                "risk_score": risk_check.risk_score,
                "rule_results": risk_check.rule_results_json,
                "warnings": risk_check.warnings_json,
                "block_reasons": risk_check.block_reasons_json,
                "market_data_status": risk_check.market_data_status,
            },
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
        notional = risk_check.position_size * risk_check.entry_price
        leverage = notional / risk_check.account_equity if risk_check.account_equity else 0
        rule_results = risk_check.rule_results_json or risk_check.checks_json or []
        return {
            "id": risk_check.id,
            "workflow_id": risk_check.workflow_id,
            "hypothesis_id": risk_check.hypothesis_id,
            "backtest_id": risk_check.backtest_id,
            "decision": risk_check.decision,
            "status": risk_check.decision,
            "risk_level": risk_check.risk_level,
            "risk_score": risk_check.risk_score,
            "account_equity": risk_check.account_equity,
            "risk_per_trade": risk_check.risk_per_trade,
            "position_size": risk_check.position_size,
            "entry_price": risk_check.entry_price,
            "stop_loss": risk_check.stop_loss,
            "take_profit": risk_check.take_profit,
            "max_loss": risk_check.max_loss,
            "reward_risk": risk_check.reward_risk,
            "leverage": leverage,
            "execution_mode": "paper",
            "live_trading_enabled": False,
            "checks": rule_results,
            "rule_results": rule_results,
            "blocks": risk_check.block_reasons_json,
            "warnings": risk_check.warnings_json,
            "block_reasons": risk_check.block_reasons_json,
            "market_data_status": risk_check.market_data_status,
            "created_at": risk_check.created_at,
            "is_mock": risk_check.is_mock,
            "source": risk_check.source,
        }

    @staticmethod
    def list(db: Session, limit: int = 50) -> list[dict]:
        stmt = select(RiskCheck).order_by(RiskCheck.created_at.desc()).limit(limit)
        return [RiskEngine.to_schema(risk_check) for risk_check in db.scalars(stmt)]

    @classmethod
    def rules(cls) -> list[dict]:
        return cls.rule_definitions

    def _load_settings(self, db: Session, request: RiskCheckRequest) -> RiskSettings:
        record = db.scalar(select(UserSettings).order_by(UserSettings.created_at.desc()).limit(1))
        settings_json = record.settings_json if record and isinstance(record.settings_json, dict) else {}
        risk_json = settings_json.get("risk") if isinstance(settings_json.get("risk"), dict) else {}
        account_json = settings_json.get("paper_account") if isinstance(settings_json.get("paper_account"), dict) else {}
        account_equity = _positive_float(account_json.get("equity"), request.account_equity, 10000)
        risk_per_trade = _positive_float(risk_json.get("risk_per_trade"), request.risk_per_trade, 0.01)
        daily_loss_limit = _positive_float(risk_json.get("daily_loss_limit"), account_equity * 0.03)
        live_trading_enabled = bool(record.real_trading_enabled) if record else False
        return RiskSettings(
            account_equity=account_equity,
            risk_per_trade=risk_per_trade,
            max_drawdown=_ratio_value(risk_json.get("max_drawdown"), 0.12),
            min_trade_count=int(_positive_float(risk_json.get("min_trade_count"), 50)),
            max_spread_ratio=_ratio_value(risk_json.get("max_spread_ratio"), 0.002),
            min_liquidity_score=_positive_float(risk_json.get("min_liquidity_score"), 60),
            max_volatility_score=_positive_float(risk_json.get("max_volatility_score"), 80),
            max_btc_correlation=_positive_float(risk_json.get("max_btc_correlation"), 0.70),
            min_stop_distance_ratio=_ratio_value(risk_json.get("min_stop_distance_ratio"), 0.003),
            max_stop_distance_ratio=_ratio_value(risk_json.get("max_stop_distance_ratio"), 0.08),
            daily_loss_limit=daily_loss_limit,
            daily_realized_loss=_positive_float(account_json.get("daily_realized_loss"), 0),
            live_trading_enabled=live_trading_enabled,
        )

    @staticmethod
    def _latest_backtest(db: Session, hypothesis_id: str) -> BacktestResult | None:
        stmt = (
            select(BacktestResult)
            .where(BacktestResult.hypothesis_id == hypothesis_id)
            .order_by(BacktestResult.created_at.desc())
            .limit(1)
        )
        return db.scalar(stmt)

    def _market_snapshot(self, symbol: str, timeframe: str, request: RiskCheckRequest) -> dict[str, Any]:
        status = "live"
        ticker: dict[str, Any]
        orderbook: dict[str, Any]
        klines: list[dict]
        btc_klines: list[dict]
        try:
            ticker = self.market_data.get_ticker(symbol)
        except MarketProviderError as exc:
            status = "unavailable"
            ticker = {"symbol": symbol, "price": request.entry_price or 0, "source": "unavailable", "status": "unavailable", "is_mock": False, "error": str(exc)}
        try:
            orderbook = self.market_data.get_orderbook(symbol, depth=20)
        except MarketProviderError as exc:
            status = "unavailable"
            entry_price = request.entry_price or ticker.get("price") or 0
            orderbook = {
                "symbol": symbol,
                "spread": 0,
                "mid_price": entry_price,
                "liquidity_score": 0,
                "bids": [],
                "asks": [],
                "source": "unavailable",
                "status": "unavailable",
                "is_mock": False,
                "error": str(exc),
            }
        try:
            klines = self.market_data.get_klines(symbol, timeframe, limit=120).get("klines", [])
        except MarketProviderError:
            status = "unavailable"
            klines = []
        try:
            btc_klines = self.market_data.get_klines("BTC/USDT", timeframe, limit=120).get("klines", [])
        except MarketProviderError:
            status = "unavailable"
            btc_klines = []
        return {"status": status, "ticker": ticker, "orderbook": orderbook, "klines": klines, "btc_klines": btc_klines}

    def _evaluate(
        self,
        *,
        request: RiskCheckRequest,
        settings: RiskSettings,
        hypothesis: Hypothesis | None,
        backtest: BacktestResult | None,
        ticker: dict,
        orderbook: dict,
        klines: list[dict],
        btc_klines: list[dict],
        market_data_status: str,
    ) -> dict[str, Any]:
        warnings: list[str] = []
        block_reasons: list[str] = []
        rules: list[dict[str, str]] = []
        entry_price = _positive_float(request.entry_price, ticker.get("price"), orderbook.get("mid_price"))
        stop_loss = _positive_float(request.stop_loss, hypothesis.stop_loss if hypothesis else None, 0)
        take_profit = request.take_profit if request.take_profit is not None else (hypothesis.take_profit if hypothesis else None)
        stop_distance = abs(entry_price - stop_loss) if entry_price and stop_loss else 0
        stop_distance_ratio = stop_distance / entry_price if entry_price else 0
        reward_distance = abs(float(take_profit) - entry_price) if take_profit and entry_price else 0
        reward_risk = reward_distance / stop_distance if stop_distance else 0
        allowed_loss = settings.account_equity * settings.risk_per_trade
        suggested_size = allowed_loss / stop_distance if stop_distance else 0
        requested_size = request.position_size if request.position_size is not None and request.position_size > 0 else suggested_size
        position_size = max(0.0, min(suggested_size, requested_size))
        max_loss = stop_distance * position_size if stop_distance else 0
        spread_ratio = float(orderbook.get("spread") or 0) / entry_price if entry_price else 0
        liquidity_score = float(orderbook.get("liquidity_score") or 0)
        volatility = _estimate_volatility(klines)
        volatility_score = min(100.0, round(volatility * 2000, 2))
        btc_correlation = _correlation(_returns(klines), _returns(btc_klines))
        resistance_distance = _nearest_resistance_distance(klines, entry_price)
        daily_loss_triggered = settings.daily_realized_loss >= settings.daily_loss_limit
        text = " ".join(
            [
                hypothesis.summary if hypothesis else "",
                " ".join(hypothesis.warnings_json or []) if hypothesis else "",
                " ".join(hypothesis.reasons_json or []) if hypothesis else "",
                (hypothesis.risk_note or "") if hypothesis else "",
            ]
        ).lower()
        hard_hits = [keyword for keyword in self.hard_block_keywords if keyword in text]

        def add(name: str, label: str, passed: bool, threshold: str, actual: str, warning: bool = False) -> None:
            status = "PASS" if passed else ("WARNING" if warning else "BLOCK")
            message = f"{label}: {actual} vs {threshold}."
            rules.append({"name": name, "status": status, "message": message, "threshold": threshold, "actual": actual})
            if status == "WARNING":
                warnings.append(message)
            if status == "BLOCK":
                block_reasons.append(message)

        add(
            "expectancy_positive",
            "Backtest Expectancy Positive",
            bool(backtest and backtest.expectancy > 0),
            "> 0",
            _fmt_number(backtest.expectancy) if backtest else "missing backtest",
        )
        add(
            "profit_factor",
            "Profit Factor",
            bool(backtest and backtest.profit_factor >= 1.2),
            ">= 1.20",
            _fmt_number(backtest.profit_factor) if backtest else "missing backtest",
        )
        add(
            "max_drawdown",
            "Max Drawdown Below Threshold",
            bool(backtest and backtest.max_drawdown <= settings.max_drawdown),
            _fmt_pct(settings.max_drawdown),
            _fmt_pct(backtest.max_drawdown) if backtest else "missing backtest",
            warning=bool(backtest and backtest.max_drawdown <= settings.max_drawdown * 1.2),
        )
        add(
            "sample_size",
            "Sample Size Sufficient",
            bool(backtest and backtest.trade_count >= settings.min_trade_count),
            f">= {settings.min_trade_count}",
            str(backtest.trade_count) if backtest else "missing backtest",
        )
        add(
            "spread",
            "Spread Acceptable",
            spread_ratio <= settings.max_spread_ratio,
            f"<= {_fmt_pct(settings.max_spread_ratio)}",
            _fmt_pct(spread_ratio),
            warning=spread_ratio <= settings.max_spread_ratio * 1.5,
        )
        add(
            "liquidity",
            "Liquidity Score",
            liquidity_score >= settings.min_liquidity_score,
            f">= {_fmt_number(settings.min_liquidity_score)}",
            _fmt_number(liquidity_score),
            warning=market_data_status != "live" or liquidity_score >= settings.min_liquidity_score * 0.8,
        )
        add(
            "volatility",
            "Volatility Not Extreme",
            volatility_score <= settings.max_volatility_score,
            f"<= {_fmt_number(settings.max_volatility_score)}",
            _fmt_number(volatility_score),
            warning=volatility_score <= min(100, settings.max_volatility_score * 1.15),
        )
        add(
            "btc_correlation",
            "BTC Correlation Risk",
            abs(btc_correlation) <= settings.max_btc_correlation,
            f"<= {_fmt_number(settings.max_btc_correlation)}",
            _fmt_number(btc_correlation),
            warning=abs(btc_correlation) <= min(1, settings.max_btc_correlation + 0.1),
        )
        add(
            "resistance_distance",
            "Resistance Not Nearby",
            resistance_distance is None or resistance_distance >= 0.01,
            ">= 1.00% away",
            "none above entry" if resistance_distance is None else _fmt_pct(resistance_distance),
            warning=resistance_distance is not None and resistance_distance >= 0.006,
        )
        add(
            "stop_loss_distance",
            "Stop-Loss Distance Reasonable",
            stop_distance > 0 and settings.min_stop_distance_ratio <= stop_distance_ratio <= settings.max_stop_distance_ratio,
            f"{_fmt_pct(settings.min_stop_distance_ratio)} - {_fmt_pct(settings.max_stop_distance_ratio)}",
            _fmt_pct(stop_distance_ratio) if stop_distance else "missing stop",
        )
        add(
            "risk_per_trade",
            "Risk Per Trade",
            settings.risk_per_trade <= 0.01,
            "<= 1.00%",
            _fmt_pct(settings.risk_per_trade),
        )
        add(
            "daily_loss_limit",
            "Daily Loss Limit Not Triggered",
            not daily_loss_triggered,
            f"< {_fmt_number(settings.daily_loss_limit)}",
            _fmt_number(settings.daily_realized_loss),
        )
        add(
            "live_trading_disabled",
            "Live Trading Disabled",
            not settings.live_trading_enabled,
            "false",
            str(settings.live_trading_enabled).lower(),
        )
        add(
            "hard_block_keywords",
            "Hard Block News or Hypothesis Keywords",
            not hard_hits,
            "no hard-block keyword",
            ", ".join(hard_hits) if hard_hits else "none",
        )
        add(
            "market_data_available",
            "Market Data Available",
            market_data_status == "live",
            "live",
            market_data_status,
            warning=True,
        )

        warnings = list(dict.fromkeys(warnings))
        block_reasons = list(dict.fromkeys(block_reasons))
        block_count = sum(1 for rule in rules if rule["status"] == "BLOCK")
        warning_count = sum(1 for rule in rules if rule["status"] == "WARNING")
        base_risk = float(hypothesis.risk if hypothesis else 35)
        risk_score = min(
            100.0,
            round(base_risk * 0.25 + volatility_score * 0.25 + spread_ratio * 10000 + block_count * 18 + warning_count * 7, 2),
        )
        if block_count:
            decision = "REJECTED"
        elif warning_count:
            decision = "CONDITIONAL"
        else:
            decision = "APPROVED"
        risk_level = _risk_level(risk_score, block_count)
        return {
            "decision": decision,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "account_equity": settings.account_equity,
            "risk_per_trade": settings.risk_per_trade,
            "position_size": position_size,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "max_loss": max_loss,
            "reward_risk": reward_risk,
            "rule_results": rules,
            "warnings": warnings,
            "block_reasons": block_reasons,
            "market_data_status": market_data_status,
        }


def _positive_float(*values: Any) -> float:
    for value in values:
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            return parsed
    return 0.0


def _ratio_value(value: Any, fallback: float) -> float:
    parsed = _positive_float(value, fallback)
    return parsed / 100 if parsed > 1 else parsed


def _fmt_number(value: float | int | None) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.4g}"


def _fmt_pct(value: float | int | None) -> str:
    if value is None:
        return "n/a"
    return f"{float(value) * 100:.2f}%"


def _returns(klines: list[dict]) -> list[float]:
    closes = [float(row.get("close") or 0) for row in klines if row.get("close")]
    return [(current - previous) / previous for previous, current in zip(closes, closes[1:]) if previous]


def _estimate_volatility(klines: list[dict]) -> float:
    returns = _returns(klines)
    if len(returns) < 2:
        return 0.0
    avg = mean(returns)
    return sqrt(sum((item - avg) ** 2 for item in returns) / len(returns))


def _correlation(left: list[float], right: list[float]) -> float:
    count = min(len(left), len(right))
    if count < 3:
        return 0.0
    left_sample = left[-count:]
    right_sample = right[-count:]
    left_mean = mean(left_sample)
    right_mean = mean(right_sample)
    covariance = sum((a - left_mean) * (b - right_mean) for a, b in zip(left_sample, right_sample))
    left_var = sum((a - left_mean) ** 2 for a in left_sample)
    right_var = sum((b - right_mean) ** 2 for b in right_sample)
    if not left_var or not right_var:
        return 0.0
    return covariance / sqrt(left_var * right_var)


def _nearest_resistance_distance(klines: list[dict], entry_price: float) -> float | None:
    if not entry_price:
        return None
    highs = sorted({float(row.get("high") or 0) for row in klines[-40:] if float(row.get("high") or 0) > entry_price})
    if not highs:
        return None
    return (highs[0] - entry_price) / entry_price


def _risk_level(risk_score: float, block_count: int) -> str:
    if block_count or risk_score >= 75:
        return "High"
    if risk_score >= 50:
        return "Medium"
    return "Low"


class RiskInputError(ValueError):
    def __init__(self, code: str, message: str, details: dict[str, Any]) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
