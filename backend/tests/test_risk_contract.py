from __future__ import annotations

import unittest
import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import risk as risk_api
from app.db.base import now_utc, prefixed_id
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.user_settings import UserSettings
from app.providers.market import MarketProviderError


class FakeMarketData:
    def get_ticker(self, symbol: str) -> dict:
        return {"symbol": symbol, "price": 100.0, "source": "fake_htx", "status": "live", "is_mock": False}

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict:
        return {
            "symbol": symbol,
            "spread": 0.05,
            "mid_price": 100.0,
            "liquidity_score": 80.0,
            "bids": [{"price": 99.95, "size": 20, "total": 20}],
            "asks": [{"price": 100.0, "size": 20, "total": 20}],
            "source": "fake_htx",
            "status": "live",
            "is_mock": False,
        }

    def get_klines(self, symbol: str, timeframe: str = "15m", limit: int = 120) -> dict:
        if symbol == "BTC/USDT":
            klines = [{"open": 50000, "high": 50000, "low": 50000, "close": 50000, "volume": 1} for _ in range(limit)]
        else:
            klines = [{"open": 99, "high": 99.7, "low": 98.5, "close": 99 + (index % 3) * 0.01, "volume": 1} for index in range(limit)]
        return {"symbol": symbol, "timeframe": timeframe, "klines": klines, "source": "fake_htx", "status": "live", "is_mock": False}


class UnavailableMarketData(FakeMarketData):
    def get_ticker(self, symbol: str) -> dict:
        raise MarketProviderError("HTX unavailable")

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict:
        raise MarketProviderError("HTX unavailable")

    def get_klines(self, symbol: str, timeframe: str = "15m", limit: int = 120) -> dict:
        raise MarketProviderError("HTX unavailable")


class RiskContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def setUp(self) -> None:
        risk_api.service.market_data = FakeMarketData()

    def seed_case(self, *, expectancy: float, profit_factor: float, drawdown: float, trades: int) -> tuple[str, str]:
        suffix = uuid4().hex[:10]
        workflow_id = f"wf_contract_{suffix}"
        hypothesis_id = f"hyp_contract_{suffix}"
        backtest_id = f"bt_contract_{suffix}"
        with SessionLocal() as db:
            executable_strategy = {
                "side": "long",
                "entry": {"type": "breakout", "operator": ">=", "price": 100.0, "confirmations": []},
                "exit": {"stop_loss": 98.0, "take_profit_1": 104.0, "take_profit_2": None, "time_stop_bars": 24},
                "risk": {"risk_per_trade": 0.01, "max_position_notional_pct": 1.0},
            }
            hypothesis = Hypothesis(
                id=hypothesis_id,
                workflow_id=workflow_id,
                market_event_id=None,
                ai_analysis_id=None,
                agent_run_id=None,
                symbol="ETH/USDT",
                timeframe="15m",
                label="Contract Hypothesis",
                hypothesis_type="long",
                direction="long",
                trigger="Confirm support.",
                invalidation="Break support.",
                risk_note="Paper-only contract test.",
                backtest_rule="MA test",
                suggested_action="Prepare paper draft",
                entry_condition="Entry",
                invalid_condition="Invalid",
                stop_loss=98.0,
                take_profit=104.0,
                confidence=80,
                feasibility=80,
                risk=20,
                long_confidence=80,
                short_confidence=None,
                summary="Contract hypothesis",
                reasons_json=["seeded"],
                warnings_json=[],
                raw_json={"structured_hypothesis": {"executable_strategy": executable_strategy}},
                source="contract_seed",
                status="ready_for_risk",
                is_mock=False,
                provider="seed",
                model="seed",
                is_ai_generated=False,
                analysis_mode="rule_based",
                bias="long",
                suggested_rule_json={"executable_strategy": executable_strategy},
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            backtest = BacktestResult(
                id=backtest_id,
                workflow_id=workflow_id,
                backtest_job_id=f"btjob_contract_{suffix}",
                hypothesis_id=hypothesis_id,
                win_rate=0.6,
                profit_factor=profit_factor,
                expectancy=expectancy,
                max_drawdown=drawdown,
                trade_count=trades,
                avg_rr=2.0,
                sharpe_ratio=1.1,
                sample_quality="sufficient",
                equity_curve_json=[],
                drawdown_curve_json=[],
                trade_distribution_json=[],
                verdict_json={"decision": "pass" if expectancy > 0 and profit_factor >= 1.2 and trades >= 50 else "reject"},
                strategy_rule_json={},
                report_json={},
                trades_json=[],
                metrics_json={"sample_size": trades},
                source="contract_seed",
                status="completed",
                is_mock=False,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            settings = UserSettings(
                id=prefixed_id("settings"),
                default_symbol="ETH/USDT",
                default_timeframe="15m",
                demo_mode=False,
                default_ai_provider="seed",
                paper_trading_enabled=True,
                real_trading_enabled=False,
                language="en",
                settings_json={"risk": {"risk_per_trade": 0.01, "max_drawdown": 0.12, "min_trade_count": 50}},
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add_all([hypothesis, backtest, settings])
            db.commit()
        return hypothesis_id, backtest_id

    def run_risk(self, hypothesis_id: str, backtest_id: str | None = None) -> dict:
        payload = {"hypothesis_id": hypothesis_id, "entry_price": 100, "stop_loss": 98, "take_profit": 104}
        if backtest_id:
            payload["backtest_id"] = backtest_id
        response = self.client.post("/api/risk/checks", json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["data"]

    def create_order(self, hypothesis_id: str, backtest_id: str, risk_check_id: str):
        return self.client.post(
            "/api/paper-orders",
            json={
                "hypothesis_id": hypothesis_id,
                "backtest_id": backtest_id,
                "risk_check_id": risk_check_id,
                "symbol": "ETH/USDT",
                "side": "buy",
                "order_type": "limit",
                "price": 100,
                "quantity": 1,
                "stop_loss": 98,
                "take_profit": 104,
            },
        )

    def test_approved_risk_can_create_draft_and_writes_links(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "APPROVED")
        response = self.create_order(hypothesis_id, backtest_id, risk_check["id"])
        self.assertEqual(response.status_code, 200, response.text)
        order = response.json()["data"]
        self.assertEqual(order["status"], "draft")
        self.assertEqual(order["risk_check_id"], risk_check["id"])
        with SessionLocal() as db:
            hypothesis = db.get(Hypothesis, hypothesis_id)
            self.assertEqual(hypothesis.latest_risk_check_id, risk_check["id"])
            self.assertEqual(hypothesis.latest_paper_order_id, order["id"])

    def test_conditional_risk_cannot_create_draft(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.13, trades=100)
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "CONDITIONAL")
        response = self.create_order(hypothesis_id, backtest_id, risk_check["id"])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "RISK_BLOCKED")

    def test_rejected_risk_blocks_paper_order(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=-0.1, profit_factor=0.8, drawdown=0.25, trades=10)
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "REJECTED")
        response = self.create_order(hypothesis_id, backtest_id, risk_check["id"])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "RISK_BLOCKED")

    def test_risk_check_uses_latest_backtest_when_id_omitted(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        risk_check = self.run_risk(hypothesis_id)
        self.assertEqual(risk_check["backtest_id"], backtest_id)

    def test_market_unavailable_rejects_risk(self) -> None:
        risk_api.service.market_data = UnavailableMarketData()
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["market_data_status"], "unavailable")
        self.assertEqual(risk_check["status"], "REJECTED")
        self.assertIn("market_data_live", risk_check["block_reasons"])

    def test_no_trade_hypothesis_rejects_risk(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        with SessionLocal() as db:
            hypothesis = db.get(Hypothesis, hypothesis_id)
            hypothesis.direction = "no_trade"
            hypothesis.raw_json = {"structured_hypothesis": {"executable_strategy": {"side": "no_trade"}}}
            hypothesis.suggested_rule_json = {"executable_strategy": {"side": "no_trade"}}
            db.commit()
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "REJECTED")
        self.assertIn("hypothesis_tradeable", risk_check["block_reasons"])

    def test_backtest_caution_blocks_risk_approval(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        with SessionLocal() as db:
            backtest = db.get(BacktestResult, backtest_id)
            backtest.verdict_json = {"decision": "caution"}
            db.commit()
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "REJECTED")
        self.assertIn("backtest_verdict_pass", risk_check["block_reasons"])

    def test_demo_scenario_pass_does_not_relax_risk_thresholds(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=-0.1, profit_factor=0.0, drawdown=0.05, trades=100)
        with SessionLocal() as db:
            settings = db.query(UserSettings).order_by(UserSettings.created_at.desc()).first()
            settings.demo_mode = True
            settings.demo_mode_enabled = True
            settings.demo_scenario = "pass"
            backtest = db.get(BacktestResult, backtest_id)
            backtest.verdict_json = {"decision": "pass"}
            db.commit()
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "REJECTED")
        self.assertIn("expectancy_positive", risk_check["block_reasons"])
        self.assertIn("profit_factor", risk_check["block_reasons"])

    def test_long_order_requires_stop_entry_target_ordering(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        with SessionLocal() as db:
            hypothesis = db.get(Hypothesis, hypothesis_id)
            bad_strategy = {
                "side": "long",
                "entry": {"type": "breakout", "operator": ">=", "price": 100.0, "confirmations": []},
                "exit": {"stop_loss": 101.0, "take_profit_1": 104.0, "take_profit_2": None, "time_stop_bars": 24},
                "risk": {"risk_per_trade": 0.01, "max_position_notional_pct": 1.0},
            }
            hypothesis.raw_json = {"structured_hypothesis": {"executable_strategy": bad_strategy}}
            hypothesis.suggested_rule_json = {"executable_strategy": bad_strategy}
            db.commit()
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "REJECTED")
        self.assertIn("side_price_consistency", risk_check["block_reasons"])

    def test_short_order_requires_stop_entry_target_ordering(self) -> None:
        hypothesis_id, backtest_id = self.seed_case(expectancy=0.4, profit_factor=1.5, drawdown=0.05, trades=100)
        with SessionLocal() as db:
            hypothesis = db.get(Hypothesis, hypothesis_id)
            bad_strategy = {
                "side": "short",
                "entry": {"type": "breakdown", "operator": "<=", "price": 100.0, "confirmations": []},
                "exit": {"stop_loss": 98.0, "take_profit_1": 96.0, "take_profit_2": None, "time_stop_bars": 24},
                "risk": {"risk_per_trade": 0.01, "max_position_notional_pct": 1.0},
            }
            hypothesis.direction = "short"
            hypothesis.raw_json = {"structured_hypothesis": {"executable_strategy": bad_strategy}}
            hypothesis.suggested_rule_json = {"executable_strategy": bad_strategy}
            db.commit()
        risk_check = self.run_risk(hypothesis_id, backtest_id)
        self.assertEqual(risk_check["status"], "REJECTED")
        self.assertIn("side_price_consistency", risk_check["block_reasons"])


if __name__ == "__main__":
    unittest.main()
