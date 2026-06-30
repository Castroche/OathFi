from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

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
            "klines": {"klines": [{"open": 1540, "high": 1580, "low": 1536, "close": 1560 + index * 0.1} for index in range(100)]},
            "trades": {"items": []},
            "source": "test_context",
            "status": "live",
            "is_mock": False,
            "updated_at": now_utc(),
        }


PROVIDER_OUTPUT = {
    "summary": "市场结构偏上行，但仍要求仅用于模拟交易。",
    "validity": "high",
    "overall_confidence": 72,
    "hypotheses": [
        {
            "label": "假设 A",
            "direction": "long",
            "setup_type": "breakout",
            "confidence": 72,
            "market_regime": "上行突破",
            "thesis_summary": "现价站上 MA20 且盘口买方略占优，只有突破 1585.00 后才生成模拟做多规则。",
            "evidence": {
                "kline_evidence": "现价 1570.00 位于 MA20=1560.00 上方，近期阻力 1585.00。",
                "indicator_evidence": "RSI=58，MACD 为偏多状态。",
                "orderbook_evidence": "点差 0.45，imbalance=0.25。",
                "volume_evidence": "成交量为 20 均量的 1.2 倍。",
                "risk_evidence": "实盘交易已禁用；仅允许模拟交易。",
            },
            "entry_plan": {
                "entry_type": "breakout_trigger",
                "trigger_price": 1585.0,
                "confirmation_condition": "价格突破 1585.00 且 RSI 保持 52 以上。",
                "invalidation_price": 1538.0,
                "stop_loss": 1538.0,
                "take_profit_1": 1660.0,
                "take_profit_2": 1688.4,
                "expected_rr": 1.5,
            },
            "risk_notes": "风险来自突破失败和盘口流动性收缩；实盘交易已禁用，仅允许模拟交易。",
            "why_not_opposite_direction": "价格与 RSI 未形成做空共振。",
            "invalidation_conditions": "价格跌破 1538.00 或 MACD 转弱。",
            "backtest_rule": {
                "entry_rule": "价格突破 1585.00 且 RSI 保持 52 以上。",
                "exit_rule": "价格跌破 1538.00 或 MACD 转弱。",
                "stop_rule": "止损设在 1538.00。",
                "take_profit_rule": "第一止盈 1660.00，第二止盈 1688.40。",
                "position_sizing_rule": "单笔风险不超过账户权益 1%，仅模拟交易。",
            },
            "audit_summary": "Provider 输出已保留，规则可回测。",
            "limitations": "仅基于测试行情上下文。",
        }
    ],
}

INVALID_PROVIDER_OUTPUT = {
    **PROVIDER_OUTPUT,
    "hypotheses": [
        {
            **PROVIDER_OUTPUT["hypotheses"][0],
            "thesis_summary": "模板价位输出：突破 102 后做多。",
            "entry_plan": {
                **PROVIDER_OUTPUT["hypotheses"][0]["entry_plan"],
                "trigger_price": 102.0,
                "invalidation_price": 96.0,
                "stop_loss": 96.0,
                "take_profit_1": 106.0,
                "take_profit_2": 109.0,
            },
            "backtest_rule": {
                **PROVIDER_OUTPUT["hypotheses"][0]["backtest_rule"],
                "entry_rule": "价格突破 102.00 且 RSI 保持 52 以上。",
                "exit_rule": "价格跌破 96.00 或 MACD 转弱。",
                "stop_rule": "止损设在 96.00。",
                "take_profit_rule": "第一止盈 106.00，第二止盈 109.00。",
            },
            "risk_notes": "风险来自突破失败；Live Trading Disabled，Paper Trading Only。",
        }
    ],
}

ENGLISH_PROVIDER_OUTPUT = {
    **PROVIDER_OUTPUT,
    "summary": "Market structure is bullish, but paper trading remains mandatory.",
    "hypotheses": [
        {
            **PROVIDER_OUTPUT["hypotheses"][0],
            "label": "Hypothesis A",
            "market_regime": "bullish breakout",
            "thesis_summary": "ETH/USDT is near recent high with strong bid support and positive imbalance. Long entry if price clears ask wall with volume confirmation.",
            "evidence": {
                "kline_evidence": "Price is above MA20 and testing recent resistance.",
                "indicator_evidence": "RSI is constructive and MACD is bullish.",
                "orderbook_evidence": "Bid support is stronger than ask depth.",
                "volume_evidence": "Volume is above the recent average.",
                "risk_evidence": "Live Trading Disabled; Paper Trading Only.",
            },
            "entry_plan": {
                **PROVIDER_OUTPUT["hypotheses"][0]["entry_plan"],
                "confirmation_condition": "Enter long after price clears the ask wall with volume confirmation.",
            },
            "risk_notes": "Risk comes from failed breakout, spread widening, and liquidity reversal.",
            "why_not_opposite_direction": "Short setup lacks confirmation from trend and orderbook.",
            "invalidation_conditions": "Invalidate if price loses MA20 or MACD turns bearish.",
            "backtest_rule": {
                "entry_rule": "Enter after breakout with RSI confirmation.",
                "exit_rule": "Exit if price loses support.",
                "stop_rule": "Use recent support as stop.",
                "take_profit_rule": "Scale out at resistance extensions.",
                "position_sizing_rule": "Risk no more than 1% account equity.",
            },
            "audit_summary": "Provider output preserved for audit.",
            "limitations": "Only public market data was used.",
        }
    ],
}


class AgentProviderOutputTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def setUp(self) -> None:
        self.original_context = agent_api.service.context
        self.original_config_for = agent_api.service.provider_registry.config_for
        self.original_run_analysis = agent_api.service.ai_gateway.run_analysis
        agent_api.service.context = FakeAgentContext()
        agent_api.service.provider_registry.config_for = lambda name: SimpleNamespace(configured=True, default_model="deepseek-v4-flash")
        agent_api.service.ai_gateway.run_analysis = lambda db, request, workflow_id=None: {
            "ai_analysis_id": None,
            "provider": "deepseek",
            "model": "deepseek-v4-flash",
            "source": "deepseek",
            "is_mock": False,
            "analysis_mode": "ai",
            "is_ai_generated": True,
            "latency_ms": 123,
            "raw_output": PROVIDER_OUTPUT,
        }

    def tearDown(self) -> None:
        agent_api.service.context = self.original_context
        agent_api.service.provider_registry.config_for = self.original_config_for
        agent_api.service.ai_gateway.run_analysis = self.original_run_analysis

    def test_provider_output_is_preserved_when_configured_and_successful(self) -> None:
        response = self.client.post(
            "/api/agent/hypotheses/generate",
            json={"symbol": "ETH/USDT", "timeframe": "15m", "mode": "ai", "provider": "deepseek", "language": "zh-CN"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        hypothesis = data["hypotheses"][0]

        self.assertTrue(data["is_ai_generated"])
        self.assertEqual(data["provider_status"], "provider_success")
        self.assertEqual(data["model"], "deepseek-v4-flash")
        self.assertIsNone(data["fallback_reason"])
        self.assertIsNotNone(data["provider_raw_output"])
        self.assertEqual(data["provider_raw_output"]["model"], "deepseek-v4-flash")
        self.assertNotIn("暂无 Provider 输出", response.text)
        self.assertEqual(hypothesis["latency_ms"], 123)
        self.assertEqual(hypothesis["model"], "deepseek-v4-flash")
        self.assertEqual(hypothesis["structured_hypothesis"]["model"], "deepseek-v4-flash")
        entry_plan = hypothesis["structured_hypothesis"]["entry_plan"]
        self.assertEqual(entry_plan["trigger_price"], 1585.0)
        self.assertEqual(entry_plan["stop_loss"], 1538.0)
        self.assertEqual(entry_plan["take_profit_1"], 1660.0)
        self.assertEqual(hypothesis["structured_hypothesis"]["backtest_rule"]["entry_rule"], "价格突破 1585.00 且 RSI 保持 52 以上。")
        self.assertNotIn("Live Trading Disabled", hypothesis["structured_hypothesis"]["risk_notes"])
        self.assertNotIn("Paper Trading Only", hypothesis["structured_hypothesis"]["risk_notes"])

    def test_provider_template_prices_are_rejected_before_structured_hypothesis(self) -> None:
        agent_api.service.ai_gateway.run_analysis = lambda db, request, workflow_id=None: {
            "ai_analysis_id": None,
            "provider": "deepseek",
            "model": "deepseek-v4-flash",
            "source": "deepseek",
            "is_mock": False,
            "analysis_mode": "ai",
            "is_ai_generated": True,
            "latency_ms": 123,
            "raw_output": INVALID_PROVIDER_OUTPUT,
        }
        response = self.client.post(
            "/api/agent/hypotheses/generate",
            json={"symbol": "ETH/USDT", "timeframe": "15m", "mode": "ai", "provider": "deepseek", "language": "zh-CN"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        hypothesis = data["hypotheses"][0]
        structured = hypothesis["structured_hypothesis"]
        entry_plan = structured["entry_plan"]

        self.assertFalse(data["is_ai_generated"])
        self.assertEqual(data["error_type"], "provider_output_invalid")
        self.assertIn("provider_output_invalid", data["provider_status"])
        self.assertTrue(data["fallback_reason"])
        self.assertEqual(data["provider_raw_output"]["hypotheses"][0]["entry_plan"]["trigger_price"], 102.0)
        for key in ("trigger_price", "stop_loss", "take_profit_1", "take_profit_2"):
            value = entry_plan[key]
            if value is not None:
                self.assertLessEqual(abs(value - 1570.0) / 1570.0, 0.2, key)
                self.assertNotIn(value, {102.0, 96.0, 106.0, 109.0})
        self.assertNotIn("Live Trading Disabled", structured["risk_notes"])
        self.assertNotIn("Paper Trading Only", structured["risk_notes"])
        self.assertIn("实盘交易已禁用", structured["risk_notes"])

    def test_english_provider_output_is_rejected_for_chinese_request(self) -> None:
        agent_api.service.ai_gateway.run_analysis = lambda db, request, workflow_id=None: {
            "ai_analysis_id": None,
            "provider": "deepseek",
            "model": "deepseek-v4-flash",
            "source": "deepseek",
            "is_mock": False,
            "analysis_mode": "ai",
            "is_ai_generated": True,
            "latency_ms": 123,
            "raw_output": ENGLISH_PROVIDER_OUTPUT,
        }
        response = self.client.post(
            "/api/agent/hypotheses/generate",
            json={"symbol": "ETH/USDT", "timeframe": "15m", "mode": "ai", "provider": "deepseek", "language": "zh-CN"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        structured = data["hypotheses"][0]["structured_hypothesis"]

        self.assertFalse(data["is_ai_generated"])
        self.assertEqual(data["error_type"], "provider_output_invalid")
        self.assertIn("未翻译", data["fallback_reason"])
        self.assertNotIn("strong bid support", structured["thesis_summary"])
        self.assertIn("模拟交易研究假设", structured["thesis_summary"])


if __name__ == "__main__":
    unittest.main()
