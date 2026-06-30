from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import agent as agent_api
from app.db.base import now_utc
from app.db.init_db import init_db
from app.main import app


class FakeAgentContext:
    def get_context(self, db, symbol: str = "ETH/USDT", timeframe: str = "15m") -> dict:
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "asset": symbol.split("/", 1)[0],
            "current_price": 1570.0,
            "key_levels": {"ma20": 1560.0, "ma50": 1540.0, "ma200": 1495.0, "recent_high": 1585.0, "recent_low": 1538.0},
            "volume": {"latest": 1200, "average_20": 1000, "ratio_to_20ma": 1.2, "volume_24h": 100000},
            "rsi": 58.0,
            "macd": {"value": 1, "signal": 0.8, "histogram": 0.2, "status": "bullish"},
            "order_book_summary": {"spread": 0.45, "mid_price": 1570.0, "imbalance": 0.25, "liquidity_score": 82},
            "btc_correlation": {"value": 0.5, "sample": 120, "source": "test"},
            "funding_rate": {"value": None, "label": "Planned"},
            "recent_events": [],
            "ticker": {"symbol": symbol, "price": 1570.0, "change_24h": 0.02, "volume_24h": 100000, "status": "live", "is_mock": False},
            "indicators": {"ma20": 1560.0, "ma50": 1540.0, "ma200": 1495.0, "rsi14": 58.0, "volume": 1200},
            "klines": {"klines": [{"open": 1540 + index * 0.25, "high": 1548 + index * 0.3, "low": 1532 + index * 0.22, "close": 1540 + index * 0.3} for index in range(100)]},
            "trades": {"items": []},
            "source": "test_context",
            "status": "live",
            "is_mock": False,
            "updated_at": now_utc(),
        }


class AgentStructuredOutputTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)
        agent_api.service.context = FakeAgentContext()

    def test_rule_based_output_contains_structured_research_fields(self) -> None:
        response = self.client.post(
            "/api/agent/hypotheses/generate",
            json={"symbol": "ETH/USDT", "timeframe": "15m", "mode": "rule_based", "language": "zh-CN"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        hypothesis = data["hypotheses"][0]
        structured = hypothesis["structured_hypothesis"]

        self.assertIn("evidence", structured)
        self.assertIn("entry_plan", structured)
        self.assertIn("risk_notes", structured)
        self.assertIn("backtest_rule", structured)
        self.assertIn("kline_evidence", structured["evidence"])
        self.assertIn("entry_rule", structured["backtest_rule"])
        self.assertNotEqual(structured["thesis_summary"], data["summary"])
        self.assertNotRegex(structured["thesis_summary"], re.compile(r"[A-Za-z]{12,}\\s+[A-Za-z]{8,}\\s+[A-Za-z]{8,}"))
        entry_plan = structured["entry_plan"]
        self.assertNotIn(entry_plan["trigger_price"], {102.0, 96.0, 106.0, 109.0})
        self.assertNotIn(entry_plan["stop_loss"], {102.0, 96.0, 106.0, 109.0})
        self.assertNotIn(entry_plan["take_profit_1"], {102.0, 96.0, 106.0, 109.0})
        for key in ("trigger_price", "stop_loss", "take_profit_1", "take_profit_2"):
            value = entry_plan[key]
            if value is not None:
                self.assertLessEqual(abs(value - 1570.0) / 1570.0, 0.2, key)
        self.assertNotIn("Live Trading Disabled", structured["risk_notes"])
        self.assertNotIn("Paper Trading Only", structured["risk_notes"])
        self.assertIn("实盘交易已禁用", structured["risk_notes"])
        self.assertIn("仅允许模拟交易", structured["risk_notes"])

    def test_fallback_reason_is_returned_when_provider_unavailable(self) -> None:
        response = self.client.post(
            "/api/agent/hypotheses/generate",
            json={"symbol": "ETH/USDT", "timeframe": "15m", "mode": "ai", "provider": "deepseek", "language": "zh-CN"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        if not data["is_ai_generated"]:
            self.assertTrue(data["fallback_reason"])
            self.assertIn("fallback", data["fallback_reason"])
            self.assertEqual(data["analysis_mode"], "rule_based")


if __name__ == "__main__":
    unittest.main()
