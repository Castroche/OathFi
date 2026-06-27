from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.backtest import BacktestJob, BacktestResult
from app.models.hypothesis import Hypothesis
from app.schemas.backtest import BacktestCreateRequest
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
            "methodology": "simplified_demo_kline_replay",
            "data_source": kline_snapshot.get("source", "unavailable"),
            "sample_period": f"{request.start_time.isoformat()} to {request.end_time.isoformat()}",
            "sample_size": len(candles),
            "source_status": kline_snapshot.get("status", "mock"),
            "is_mock": bool(kline_snapshot.get("is_mock", True)),
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
        log_action(
            db,
            action_type="RUN_BACKTEST",
            entity_type="backtest_result",
            entity_id=result.id,
            workflow_id=workflow_id,
            message="Stored simplified demo backtest result.",
            payload={"backtest_job_id": job.id, **metrics},
            source=result.source,
            status="completed",
            is_mock=result.is_mock,
        )
        db.commit()
        db.refresh(result)
        return self.to_schema(result)

    def get(self, db: Session, backtest_id: str) -> dict | None:
        result = db.get(BacktestResult, backtest_id)
        return self.to_schema(result) if result else None

    def list(self, db: Session, limit: int = 50) -> list[dict]:
        stmt = select(BacktestResult).order_by(BacktestResult.created_at.desc()).limit(limit)
        return [self.to_schema(result) for result in db.scalars(stmt)]

    @staticmethod
    def to_schema(result: BacktestResult) -> dict:
        metrics = result.metrics_json or {}
        return {
            "id": result.id,
            "workflow_id": result.workflow_id,
            "hypothesis_id": result.hypothesis_id,
            "status": result.status,
            "win_rate": result.win_rate,
            "profit_factor": result.profit_factor,
            "expectancy": result.expectancy,
            "max_drawdown": result.max_drawdown,
            "trade_count": result.trade_count,
            "avg_rr": result.avg_rr,
            "sample_quality": result.sample_quality,
            "equity_curve": result.equity_curve_json,
            "trades": result.trades_json,
            "methodology": metrics["methodology"],
            "data_source": metrics["data_source"],
            "sample_period": metrics["sample_period"],
            "created_at": result.created_at,
            "is_mock": result.is_mock,
            "source": result.source,
        }

    @staticmethod
    def _simulate(request: BacktestCreateRequest, hypothesis: Hypothesis | None, candles: list[dict]) -> dict:
        if len(candles) < 8:
            return {
                "win_rate": 0,
                "profit_factor": 0,
                "expectancy": 0,
                "max_drawdown": 0,
                "trade_count": 0,
                "avg_rr": 0,
                "sample_quality": "D - insufficient sample",
                "equity_curve": [{"time": request.start_time.isoformat(), "equity": request.initial_capital}],
                "trades": [],
            }

        direction = (hypothesis.direction if hypothesis else "long") or "long"
        stop_loss = hypothesis.stop_loss if hypothesis and hypothesis.stop_loss else None
        take_profit = hypothesis.take_profit if hypothesis and hypothesis.take_profit else None
        confidence = hypothesis.confidence if hypothesis else 55
        feasibility = hypothesis.feasibility if hypothesis else 55
        risk_score = hypothesis.risk if hypothesis else 60
        horizon = 4
        step = 6 if len(candles) > 80 else 3
        capital = request.initial_capital
        peak = capital
        max_drawdown = 0.0
        wins = 0
        gross_profit = 0.0
        gross_loss = 0.0
        rr_values: list[float] = []
        trades = []
        equity_curve = [{"time": _iso_from_candle(candles[0]), "equity": round(capital, 2)}]
        quality_bonus = (confidence + feasibility - risk_score) / 300

        for index in range(0, len(candles) - horizon, step):
            entry = float(candles[index]["close"])
            exit_price = float(candles[index + horizon]["close"])
            if direction == "short":
                pct_move = (entry - exit_price) / entry
            elif direction in {"neutral", "no_trade"}:
                pct_move = 0
            else:
                pct_move = (exit_price - entry) / entry

            adjusted_move = pct_move + quality_bonus * 0.0015
            risk_unit = _risk_unit(entry, stop_loss, take_profit, direction)
            pnl = capital * min(0.025, max(-0.02, adjusted_move * 1.6))
            capital += pnl
            peak = max(peak, capital)
            drawdown = (capital - peak) / peak if peak else 0
            max_drawdown = min(max_drawdown, drawdown)
            if pnl >= 0:
                wins += 1
                gross_profit += pnl
            else:
                gross_loss += abs(pnl)
            rr_values.append(round(pnl / risk_unit, 3) if risk_unit else 0)
            if len(trades) < 24:
                trades.append(
                    {
                        "time": _iso_from_candle(candles[index]),
                        "side": "sell" if direction == "short" else "buy",
                        "entry": round(entry, 6),
                        "exit": round(exit_price, 6),
                        "pnl": round(pnl, 2),
                        "rr": rr_values[-1],
                        "status": "win" if pnl >= 0 else "loss",
                    }
                )
            if index % (step * 4) == 0:
                equity_curve.append({"time": _iso_from_candle(candles[index + horizon]), "equity": round(capital, 2)})

        trade_count = len(rr_values)
        win_rate = wins / trade_count if trade_count else 0
        profit_factor = gross_profit / gross_loss if gross_loss else (gross_profit if gross_profit else 0)
        expectancy = (gross_profit - gross_loss) / trade_count if trade_count else 0
        avg_rr = sum(rr_values) / trade_count if trade_count else 0
        equity_curve.append({"time": _iso_from_candle(candles[-1]), "equity": round(capital, 2)})

        return {
            "win_rate": round(win_rate, 4),
            "profit_factor": round(profit_factor, 4),
            "expectancy": round(expectancy, 4),
            "max_drawdown": round(max_drawdown, 4),
            "trade_count": trade_count,
            "avg_rr": round(avg_rr, 4),
            "sample_quality": _sample_quality(len(candles), trade_count),
            "equity_curve": equity_curve,
            "trades": trades,
        }


def _risk_unit(entry: float, stop_loss: float | None, take_profit: float | None, direction: str) -> float:
    if direction == "short":
        stop_distance = abs((stop_loss or (entry * 1.015)) - entry)
        target_distance = abs(entry - (take_profit or (entry * 0.97)))
    else:
        stop_distance = abs(entry - (stop_loss or (entry * 0.985)))
        target_distance = abs((take_profit or (entry * 1.03)) - entry)
    return max((stop_distance + target_distance) / 2, entry * 0.0025)


def _sample_quality(sample_size: int, trade_count: int) -> str:
    if sample_size >= 200 and trade_count >= 30:
        return "B - demo simplified"
    if sample_size >= 100 and trade_count >= 15:
        return "C - limited demo"
    return "D - thin sample"


def _iso_from_candle(candle: dict) -> str:
    timestamp = candle.get("timestamp")
    if isinstance(timestamp, (int, float)):
        return datetime.fromtimestamp(timestamp / 1000).isoformat()
    return now_utc().isoformat()
