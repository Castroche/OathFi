from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.backtest import BacktestJob, BacktestResult
from app.models.hypothesis import Hypothesis
from app.schemas.backtest import BacktestCreateRequest
from app.services.executable_strategy import MIN_REWARD_RISK, strategy_from_hypothesis, validate_executable_strategy
from app.services.market_data_service import MarketDataService
from app.services.workflow_service import log_action, new_workflow_id


class BacktestService:
    def __init__(self) -> None:
        self.market_data = MarketDataService()

    def run(self, db: Session, request: BacktestCreateRequest) -> dict:
        hypothesis = db.get(Hypothesis, request.hypothesis_id)
        workflow_id = hypothesis.workflow_id if hypothesis else new_workflow_id()
        kline_snapshot = self.market_data.get_klines(request.symbol, request.timeframe, limit=240)
        candles = kline_snapshot.get("klines", [])
        backtest = self._simulate(request, hypothesis, candles)
        job = BacktestJob(
            id=prefixed_id("bt_job"),
            workflow_id=workflow_id,
            hypothesis_id=request.hypothesis_id,
            symbol=request.symbol,
            timeframe=request.timeframe,
            start_time=request.start_time,
            end_time=request.end_time,
            initial_capital=request.initial_capital,
            source=kline_snapshot.get("source", "unavailable"),
            status="completed",
            is_mock=bool(kline_snapshot.get("is_mock", True)),
            error_message=None,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        metrics = {
            "methodology": "deterministic_kline_replay",
            "data_source": kline_snapshot.get("source", "unavailable"),
            "sample_period": f"{request.start_time.isoformat()} to {request.end_time.isoformat()}",
            "sample_size": len(candles),
            "source_status": kline_snapshot.get("status", "mock"),
            "is_mock": bool(kline_snapshot.get("is_mock", True)),
            "fees": backtest["fees"],
            "slippage": backtest["slippage"],
            "initial_capital": request.initial_capital,
            "final_equity": backtest["final_equity"],
            "net_pnl": backtest["net_pnl"],
            "max_consecutive_losses": backtest["max_consecutive_losses"],
            "exposure_time": backtest["exposure_time"],
            "data_window": backtest["data_window"],
            "strategy_rule_snapshot": backtest["strategy_rule_snapshot"],
        }
        result = BacktestResult(
            id=prefixed_id("bt"),
            workflow_id=workflow_id,
            backtest_job_id=job.id,
            hypothesis_id=request.hypothesis_id,
            win_rate=backtest["win_rate"],
            profit_factor=backtest["profit_factor"],
            expectancy=backtest["expectancy"],
            max_drawdown=backtest["max_drawdown"],
            trade_count=backtest["trade_count"],
            avg_rr=backtest["avg_rr"],
            sample_quality=backtest["sample_quality"],
            equity_curve_json=backtest["equity_curve"],
            drawdown_curve_json=backtest["drawdown_curve"],
            trade_distribution_json=backtest["pnl_distribution"],
            verdict_json=backtest["verdict"],
            strategy_rule_json=backtest["strategy_rule_snapshot"],
            report_json=backtest["report"],
            trades_json=backtest["trades"],
            metrics_json=metrics,
            source=kline_snapshot.get("source", "unavailable"),
            status="completed",
            is_mock=bool(kline_snapshot.get("is_mock", True)),
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(job)
        db.add(result)
        if hypothesis is not None:
            hypothesis.latest_backtest_result_id = result.id
            hypothesis.updated_at = now_utc()
        log_action(
            db,
            action_type="RUN_BACKTEST",
            entity_type="backtest_result",
            entity_id=result.id,
            workflow_id=workflow_id,
            message="Stored executable strategy replay backtest result.",
            payload={"backtest_job_id": job.id, **metrics},
            source=result.source,
            status="completed",
            is_mock=result.is_mock,
        )
        db.commit()
        db.refresh(result)
        return self.to_schema(db, result)

    def get(self, db: Session, backtest_id: str) -> dict | None:
        result = db.get(BacktestResult, backtest_id)
        return self.to_schema(db, result) if result else None

    def list(self, db: Session, limit: int = 50) -> list[dict]:
        stmt = select(BacktestResult).order_by(BacktestResult.created_at.desc()).limit(limit)
        return [self.to_schema(db, result) for result in db.scalars(stmt)]

    def to_schema(self, db: Session, result: BacktestResult) -> dict:
        metrics = result.metrics_json or {}
        job = db.get(BacktestJob, result.backtest_job_id)
        hypothesis = db.get(Hypothesis, result.hypothesis_id)
        strategy_id = getattr(job, "strategy_rule_id", None) if job else None
        symbol = job.symbol if job else (hypothesis.symbol if hypothesis else "")
        timeframe = job.timeframe if job else (hypothesis.timeframe if hypothesis else "")
        return {
            "id": result.id,
            "workflow_id": result.workflow_id,
            "hypothesis_id": result.hypothesis_id,
            "strategy_id": strategy_id or result.backtest_job_id,
            "symbol": symbol,
            "timeframe": timeframe,
            "status": result.status,
            "win_rate": result.win_rate,
            "profit_factor": result.profit_factor,
            "expectancy": result.expectancy,
            "max_drawdown": result.max_drawdown,
            "sample_size": int(metrics.get("sample_size") or 0),
            "trade_count": result.trade_count,
            "avg_rr": result.avg_rr,
            "sharpe": getattr(result, "sharpe_ratio", 0.0),
            "sample_quality": result.sample_quality,
            "equity_curve": result.equity_curve_json,
            "drawdown_curve": result.drawdown_curve_json or [],
            "pnl_distribution": result.trade_distribution_json or [],
            "trades": result.trades_json,
            "methodology": metrics.get("methodology", "deterministic_kline_replay"),
            "data_source": metrics.get("data_source", result.source),
            "sample_period": metrics.get("sample_period", ""),
            "fees": float(metrics.get("fees") or 0),
            "slippage": float(metrics.get("slippage") or 0),
            "initial_capital": float(metrics.get("initial_capital") or (job.initial_capital if job else 0)),
            "final_equity": float(metrics.get("final_equity") or 0),
            "net_pnl": float(metrics.get("net_pnl") or 0),
            "max_consecutive_losses": int(metrics.get("max_consecutive_losses") or 0),
            "exposure_time": float(metrics.get("exposure_time") or 0),
            "data_window": metrics.get("data_window", {}),
            "strategy_rule_snapshot": result.strategy_rule_json or metrics.get("strategy_rule_snapshot", {}),
            "verdict": result.verdict_json or {},
            "report": result.report_json or {},
            "created_at": result.created_at,
            "is_mock": result.is_mock,
            "source": result.source,
        }

    @staticmethod
    def _simulate(request: BacktestCreateRequest, hypothesis: Hypothesis | None, candles: list[dict]) -> dict:
        fee_rate = 0.0006
        slippage_rate = 0.0003
        strategy = strategy_from_hypothesis(hypothesis)
        validation = validate_executable_strategy(strategy, hypothesis_direction=hypothesis.direction if hypothesis else None)
        strategy_snapshot = {
            **_structured_rule_snapshot(hypothesis),
            "executable_strategy": strategy or {},
            "validation": {"valid": validation.valid, "reasons": validation.reasons},
        }

        if len(candles) < 8 or not validation.valid:
            reason = "sample_size_below_threshold" if len(candles) < 8 else "no_trade_or_invalid_executable_strategy"
            return _empty_backtest_result(
                request,
                candles,
                strategy_snapshot,
                decision="reject",
                limitations=[reason, *validation.reasons],
                fee_rate=fee_rate,
                slippage_rate=slippage_rate,
            )

        direction = validation.side
        entry_trigger = float(validation.entry_price or 0)
        stop_loss = float(validation.stop_loss or 0)
        take_profit = float(validation.take_profit or 0)
        if not entry_trigger or not stop_loss or not take_profit:
            return _empty_backtest_result(
                request,
                candles,
                strategy_snapshot,
                decision="reject",
                limitations=["missing_executable_strategy_prices"],
                fee_rate=fee_rate,
                slippage_rate=slippage_rate,
            )

        risk_json = strategy.get("risk") if isinstance(strategy, dict) and isinstance(strategy.get("risk"), dict) else {}
        risk_per_trade = _positive_ratio(risk_json.get("risk_per_trade"), 0.01)
        max_notional_pct = _positive_ratio(risk_json.get("max_position_notional_pct"), 1.0)
        time_stop_bars = None
        if isinstance(strategy, dict) and isinstance(strategy.get("exit"), dict):
            time_stop_bars = _positive_int(strategy["exit"].get("time_stop_bars"))
        time_stop_bars = time_stop_bars or 24
        capital = request.initial_capital
        peak = capital
        max_drawdown = 0.0
        max_consecutive_losses = 0
        current_loss_streak = 0
        wins = 0
        gross_profit = 0.0
        gross_loss = 0.0
        rr_values: list[float] = []
        trades = []
        equity_curve = [{"time": _iso_from_candle(candles[0]), "equity": round(capital, 2)}]
        drawdown_curve = [{"time": _iso_from_candle(candles[0]), "drawdown": 0}]
        bars_in_position = 0
        open_trade: dict | None = None
        risk_distance = abs(entry_trigger - stop_loss)

        for index, candle in enumerate(candles):
            high = float(candle.get("high") or candle.get("close") or 0)
            low = float(candle.get("low") or candle.get("close") or 0)
            close = float(candle.get("close") or 0)
            if not close:
                continue

            if open_trade is None:
                triggered = high >= entry_trigger if direction == "long" else low <= entry_trigger
                if not triggered:
                    equity_curve.append({"time": _iso_from_candle(candle), "equity": round(capital, 2)})
                    drawdown_curve.append({"time": _iso_from_candle(candle), "drawdown": round(max_drawdown, 4)})
                    continue
                entry = _apply_slippage(entry_trigger, direction, slippage_rate, is_entry=True)
                allowed_loss = capital * risk_per_trade
                quantity = allowed_loss / risk_distance if risk_distance else 0
                max_quantity = (capital * max_notional_pct) / entry if entry else 0
                quantity = max(0.0, min(quantity, max_quantity))
                if quantity <= 0:
                    continue
                open_trade = {
                    "entry_index": index,
                    "entry_time": _iso_from_candle(candle),
                    "entry_price": entry,
                    "quantity": quantity,
                    "notional": entry * quantity,
                }
                bars_in_position = 0
                continue

            bars_in_position += 1
            exit_reason = None
            planned_exit = None
            if direction == "long":
                if low <= stop_loss:
                    planned_exit = stop_loss
                    exit_reason = "stop_loss"
                elif high >= take_profit:
                    planned_exit = take_profit
                    exit_reason = "take_profit"
            else:
                if high >= stop_loss:
                    planned_exit = stop_loss
                    exit_reason = "stop_loss"
                elif low <= take_profit:
                    planned_exit = take_profit
                    exit_reason = "take_profit"
            if exit_reason is None and bars_in_position >= time_stop_bars:
                planned_exit = close
                exit_reason = "time_stop"
            if exit_reason is None:
                continue

            assert open_trade is not None
            exit_price = _apply_slippage(float(planned_exit), direction, slippage_rate, is_entry=False)
            quantity = float(open_trade["quantity"])
            entry = float(open_trade["entry_price"])
            gross_pnl = (exit_price - entry) * quantity if direction == "long" else (entry - exit_price) * quantity
            costs = (entry + exit_price) * quantity * fee_rate
            pnl = gross_pnl - costs
            capital += pnl
            peak = max(peak, capital)
            drawdown = (capital - peak) / peak if peak else 0
            max_drawdown = min(max_drawdown, drawdown)
            if pnl >= 0:
                wins += 1
                gross_profit += pnl
                current_loss_streak = 0
            else:
                gross_loss += abs(pnl)
                current_loss_streak += 1
                max_consecutive_losses = max(max_consecutive_losses, current_loss_streak)
            risk_unit = abs(entry - stop_loss) * quantity
            rr = round(pnl / risk_unit, 3) if risk_unit else 0
            rr_values.append(rr)
            if len(trades) < 80:
                trades.append(
                    {
                        "entry_time": open_trade["entry_time"],
                        "exit_time": _iso_from_candle(candle),
                        "side": "sell" if direction == "short" else "buy",
                        "quantity": round(quantity, 8),
                        "notional": round(float(open_trade["notional"]), 2),
                        "entry": round(entry, 6),
                        "exit": round(exit_price, 6),
                        "entry_price": round(entry, 6),
                        "exit_price": round(exit_price, 6),
                        "pnl": round(pnl, 2),
                        "fee": round(costs, 2),
                        "slippage": round(abs(float(planned_exit) - exit_price) * quantity, 8),
                        "return_pct": round(pnl / float(open_trade["notional"]), 6) if open_trade["notional"] else 0,
                        "rr": rr,
                        "exit_reason": exit_reason,
                        "status": "win" if pnl >= 0 else "loss",
                    }
                )
            point_time = _iso_from_candle(candle)
            equity_curve.append({"time": point_time, "equity": round(capital, 2)})
            drawdown_curve.append({"time": point_time, "drawdown": round(drawdown, 4)})
            open_trade = None

        trade_count = len(rr_values)
        win_rate = wins / trade_count if trade_count else 0
        profit_factor = gross_profit / gross_loss if gross_loss else (gross_profit if gross_profit else 0)
        expectancy = (gross_profit - gross_loss) / trade_count if trade_count else 0
        avg_rr = sum(rr_values) / trade_count if trade_count else 0
        equity_curve.append({"time": _iso_from_candle(candles[-1]), "equity": round(capital, 2)})
        drawdown_curve.append({"time": _iso_from_candle(candles[-1]), "drawdown": round(max_drawdown, 4)})
        pnl_distribution = _pnl_distribution([float(trade["pnl"]) for trade in trades])
        net_pnl = capital - request.initial_capital
        min_trade_count = 30
        enough_sample = len(candles) >= 100
        passed = (
            profit_factor >= 1.2
            and expectancy > 0
            and abs(max_drawdown) <= 0.12
            and trade_count >= min_trade_count
            and avg_rr >= MIN_REWARD_RISK
            and enough_sample
        )
        verdict = {
            "decision": "pass" if passed else ("reject" if trade_count == 0 else "caution"),
            "summary": "Backtest completed with executable strategy replay.",
            "limitations": ["executable_strategy_replay", "not_live_trading", "fees_and_slippage_estimated"],
            "criteria": {
                "profit_factor_min": 1.2,
                "expectancy_positive": True,
                "max_drawdown": 0.12,
                "min_trade_count": min_trade_count,
                "avg_rr_min": MIN_REWARD_RISK,
                "sample_size_min": 100,
            },
        }
        report = {
            "strategy": strategy_snapshot,
            "assumptions": {
                "fees": fee_rate,
                "slippage": slippage_rate,
                "initial_capital": request.initial_capital,
                "paper_trading_only": True,
            },
            "data_window": {"start": _iso_from_candle(candles[0]), "end": _iso_from_candle(candles[-1]), "candles": len(candles)},
            "summary": {
                "final_equity": round(capital, 2),
                "net_pnl": round(net_pnl, 2),
                "trade_count": trade_count,
                "sample_size": len(candles),
            },
        }

        return {
            "win_rate": round(win_rate, 4),
            "profit_factor": round(profit_factor, 4),
            "expectancy": round(expectancy, 4),
            "max_drawdown": round(max_drawdown, 4),
            "trade_count": trade_count,
            "avg_rr": round(avg_rr, 4),
            "sample_quality": _sample_quality(len(candles), trade_count),
            "equity_curve": equity_curve,
            "drawdown_curve": drawdown_curve,
            "pnl_distribution": pnl_distribution,
            "trades": trades,
            "fees": fee_rate,
            "slippage": slippage_rate,
            "final_equity": round(capital, 2),
            "net_pnl": round(net_pnl, 2),
            "max_consecutive_losses": max_consecutive_losses,
            "exposure_time": round(min(1.0, trade_count / max(len(candles), 1)), 4),
            "data_window": report["data_window"],
            "strategy_rule_snapshot": strategy_snapshot,
            "verdict": verdict,
            "report": report,
        }


def _empty_backtest_result(
    request: BacktestCreateRequest,
    candles: list[dict],
    strategy_snapshot: dict,
    *,
    decision: str,
    limitations: list[str],
    fee_rate: float,
    slippage_rate: float,
) -> dict:
    start_time = _iso_from_candle(candles[0]) if candles else request.start_time.isoformat()
    end_time = _iso_from_candle(candles[-1]) if candles else request.end_time.isoformat()
    equity_curve = [{"time": start_time, "equity": request.initial_capital}]
    drawdown_curve = [{"time": start_time, "drawdown": 0}]
    report = {
        "strategy": strategy_snapshot,
        "assumptions": {
            "fees": fee_rate,
            "slippage": slippage_rate,
            "initial_capital": request.initial_capital,
            "paper_trading_only": True,
        },
        "data_window": {"start": start_time, "end": end_time, "candles": len(candles)},
        "summary": {"final_equity": request.initial_capital, "net_pnl": 0, "trade_count": 0, "sample_size": len(candles)},
    }
    return {
        "win_rate": 0,
        "profit_factor": 0,
        "expectancy": 0,
        "max_drawdown": 0,
        "trade_count": 0,
        "avg_rr": 0,
        "sample_quality": _sample_quality(len(candles), 0),
        "equity_curve": equity_curve,
        "drawdown_curve": drawdown_curve,
        "pnl_distribution": [],
        "trades": [],
        "fees": fee_rate,
        "slippage": slippage_rate,
        "final_equity": request.initial_capital,
        "net_pnl": 0,
        "max_consecutive_losses": 0,
        "exposure_time": 0,
        "data_window": report["data_window"],
        "strategy_rule_snapshot": strategy_snapshot,
        "verdict": {"decision": decision, "summary": "Backtest rejected before replay.", "limitations": limitations},
        "report": report,
    }


def _apply_slippage(price: float, direction: str, rate: float, *, is_entry: bool) -> float:
    if direction == "long":
        multiplier = 1 + rate if is_entry else 1 - rate
    else:
        multiplier = 1 - rate if is_entry else 1 + rate
    return price * multiplier


def _positive_ratio(value: object, fallback: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = fallback
    if parsed <= 0:
        parsed = fallback
    return parsed / 100 if parsed > 1 else parsed


def _positive_int(value: object) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _structured_rule_snapshot(hypothesis: Hypothesis | None) -> dict:
    if hypothesis is None:
        return {}
    rule = hypothesis.suggested_rule_json if isinstance(hypothesis.suggested_rule_json, dict) else {}
    raw = hypothesis.raw_json if isinstance(hypothesis.raw_json, dict) else {}
    structured = raw.get("structured_hypothesis") if isinstance(raw.get("structured_hypothesis"), dict) else {}
    backtest_rule = structured.get("backtest_rule") if isinstance(structured.get("backtest_rule"), dict) else {}
    entry_plan = structured.get("entry_plan") if isinstance(structured.get("entry_plan"), dict) else {}
    evidence = structured.get("evidence") if isinstance(structured.get("evidence"), dict) else {}
    return {
        "entry_rule": rule.get("entry_rule") or backtest_rule.get("entry_rule") or hypothesis.entry_condition,
        "exit_rule": rule.get("exit_rule") or backtest_rule.get("exit_rule") or hypothesis.invalid_condition,
        "stop_rule": rule.get("stop_rule") or backtest_rule.get("stop_rule") or str(hypothesis.stop_loss or ""),
        "take_profit_rule": rule.get("take_profit_rule") or backtest_rule.get("take_profit_rule") or str(hypothesis.take_profit or ""),
        "position_sizing_rule": rule.get("position_sizing_rule") or backtest_rule.get("position_sizing_rule") or "",
        "invalidation_condition": rule.get("invalidation_condition") or structured.get("invalidation_conditions") or hypothesis.invalid_condition,
        "source_evidence": rule.get("source_evidence") or evidence,
        "entry_plan": rule.get("entry_plan") or entry_plan,
    }


def _sample_quality(sample_size: int, trade_count: int) -> str:
    if sample_size >= 200 and trade_count >= 30:
        return "B - executable replay"
    if sample_size >= 100 and trade_count >= 15:
        return "C - limited replay"
    return "D - thin sample"


def _iso_from_candle(candle: dict) -> str:
    timestamp = candle.get("timestamp")
    if isinstance(timestamp, (int, float)):
        return datetime.fromtimestamp(timestamp / 1000).isoformat()
    return now_utc().isoformat()


def _pnl_distribution(values: list[float]) -> list[dict]:
    buckets = [
        ("large_loss", lambda value: value < -100),
        ("loss", lambda value: -100 <= value < 0),
        ("small_win", lambda value: 0 <= value < 100),
        ("large_win", lambda value: value >= 100),
    ]
    return [
        {"bucket": name, "count": sum(1 for value in values if predicate(value))}
        for name, predicate in buckets
    ]
