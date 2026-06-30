from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.schemas.backtest import BacktestCreateRequest
from app.db.base import now_utc
from app.models.hypothesis import Hypothesis
from app.services.backtest_service import BacktestService


class BacktestReportContractTest(unittest.TestCase):
    def test_simulation_report_contains_full_contract(self) -> None:
        request = BacktestCreateRequest(
            hypothesis_id="hyp_test",
            symbol="ETH/USDT",
            timeframe="15m",
            start_time=datetime(2026, 1, 1, tzinfo=timezone.utc),
            end_time=datetime(2026, 1, 2, tzinfo=timezone.utc),
            initial_capital=10000,
        )
        candles = [
            {
                "timestamp": 1_700_000_000_000 + index * 60_000,
                "open": 100 + index * 0.01,
                "high": 101 + index * 0.01,
                "low": 99 + index * 0.01,
                "close": 100 + ((index % 9) - 3) * 0.08 + index * 0.01,
                "volume": 10,
            }
            for index in range(240)
        ]
        executable_strategy = {
            "side": "long",
            "entry": {"type": "breakout", "operator": ">=", "price": 100.0, "confirmations": []},
            "exit": {"stop_loss": 98.0, "take_profit_1": 104.0, "take_profit_2": None, "time_stop_bars": 8},
            "risk": {"risk_per_trade": 0.01, "max_position_notional_pct": 1.0},
        }
        hypothesis = Hypothesis(
            id="hyp_test",
            workflow_id="wf_test",
            symbol="ETH/USDT",
            timeframe="15m",
            direction="long",
            entry_condition="entry",
            invalid_condition="invalid",
            confidence=80,
            feasibility=80,
            risk=20,
            summary="Executable test",
            reasons_json=[],
            warnings_json=[],
            raw_json={"structured_hypothesis": {"executable_strategy": executable_strategy}},
            suggested_rule_json={"executable_strategy": executable_strategy},
            source="test",
            status="ready_for_backtest",
            is_mock=False,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        result = BacktestService._simulate(request, hypothesis, candles)
        self.assertGreaterEqual(len(result["trades"]), 20)
        self.assertGreaterEqual(len(result["equity_curve"]), 20)
        self.assertGreaterEqual(len(result["drawdown_curve"]), 20)
        self.assertEqual(result["data_window"]["candles"], len(candles))
        self.assertNotEqual(result["data_window"]["candles"], result["trade_count"])
        for key in ["fees", "slippage", "final_equity", "net_pnl", "max_consecutive_losses", "strategy_rule_snapshot", "verdict"]:
            self.assertIn(key, result)

    def test_missing_executable_strategy_rejects_without_fake_trades(self) -> None:
        request = BacktestCreateRequest(
            hypothesis_id="hyp_test",
            symbol="ETH/USDT",
            timeframe="15m",
            start_time=datetime(2026, 1, 1, tzinfo=timezone.utc),
            end_time=datetime(2026, 1, 2, tzinfo=timezone.utc),
            initial_capital=10000,
        )
        result = BacktestService._simulate(request, None, [])
        self.assertEqual(result["trade_count"], 0)
        self.assertEqual(result["verdict"]["decision"], "reject")


if __name__ == "__main__":
    unittest.main()
