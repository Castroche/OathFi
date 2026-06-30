from __future__ import annotations

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
            "current_price": 100.0,
            "key_levels": {"ma20": 99.0, "ma50": 98.0, "ma200": 95.0, "recent_high": 102.0, "recent_low": 96.0},
            "volume": {"latest": 10, "average_20": 8, "ratio_to_20ma": 1.25, "volume_24h": 1000},
            "rsi": 58.0,
            "macd": {"value": 1, "signal": 0.8, "histogram": 0.2, "status": "bullish"},
            "order_book_summary": {"spread": 0.01, "mid_price": 100.0, "imbalance": 0.2, "liquidity_score": 80},
            "btc_correlation": {"value": 0.2, "sample": 120, "source": "test"},
            "funding_rate": {"value": None, "label": "Planned"},
            "recent_events": [],
            "ticker": {"symbol": symbol, "price": 100.0, "status": "live", "is_mock": False},
            "indicators": {"ma20": 99.0, "ma50": 98.0, "ma200": 95.0, "rsi14": 58.0, "volume": 10},
            "klines": {"klines": [{"close": 99 + index * 0.01} for index in range(80)]},
            "trades": {"items": []},
            "source": "test_context",
            "status": "live",
            "is_mock": False,
            "updated_at": now_utc(),
        }


class AgentHypothesisHistoryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)
        agent_api.service.context = FakeAgentContext()

    def test_recent_hypotheses_endpoint_returns_latest_and_filter(self) -> None:
        response = self.client.post(
            "/api/agent/hypotheses/generate",
            json={"symbol": "ETH/USDT", "timeframe": "15m", "mode": "rule_based", "language": "zh-CN"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        generated = response.json()["data"]
        hypothesis = generated["hypotheses"][0]

        recent = self.client.get("/api/agent/hypotheses?limit=10")
        self.assertEqual(recent.status_code, 200, recent.text)
        rows = recent.json()["data"]
        self.assertTrue(any(item["id"] == hypothesis["id"] for item in rows))
        self.assertIn("latest_backtest_result_id", rows[0])
        self.assertIn("latest_risk_check_id", rows[0])
        self.assertIn("latest_paper_order_id", rows[0])

        filtered = self.client.get(f"/api/agent/hypotheses?workflow_id={generated['agent_run']['workflow_id']}")
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertTrue(filtered.json()["data"])
        self.assertTrue(all(item["workflow_id"] == generated["agent_run"]["workflow_id"] for item in filtered.json()["data"]))


if __name__ == "__main__":
    unittest.main()
