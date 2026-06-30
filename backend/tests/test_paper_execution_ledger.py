from __future__ import annotations

import sys
import unittest
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import paper_orders as paper_api
from app.db.base import now_utc, prefixed_id
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.paper_order import PaperExecutionLog, PaperFill, PaperOrder, PaperPosition
from app.models.risk_check import RiskCheck
from app.providers.market import MarketProviderError


class FakeMarketData:
    def get_ticker(self, symbol: str) -> dict:
        return {"symbol": symbol, "price": 100.0, "source": "fake_htx", "status": "live", "is_mock": False}

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict:
        return {"symbol": symbol, "mid_price": 100.0, "spread": 0.01, "source": "fake_htx", "status": "live", "is_mock": False}


class UnavailableMarketData:
    def get_ticker(self, symbol: str) -> dict:
        raise MarketProviderError("HTX ticker unavailable")

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict:
        raise MarketProviderError("HTX orderbook unavailable")


class PriceMarketData(FakeMarketData):
    def __init__(self, price: float) -> None:
        self.price = price

    def get_ticker(self, symbol: str) -> dict:
        return {"symbol": symbol, "price": self.price, "source": "fake_htx", "status": "live", "is_mock": False}

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict:
        return {"symbol": symbol, "mid_price": self.price, "spread": 0.01, "source": "fake_htx", "status": "live", "is_mock": False}


class DegradedMarketData(FakeMarketData):
    def get_orderbook(self, symbol: str, depth: int = 20) -> dict:
        return {"symbol": symbol, "mid_price": 100.0, "spread": 0.01, "source": "fake_htx", "status": "stale", "is_mock": False}


class PaperExecutionLedgerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def setUp(self) -> None:
        paper_api.service.market_data = FakeMarketData()

    def seed_context(self, *, decision: str = "APPROVED") -> tuple[str, str, str]:
        suffix = uuid4().hex[:10]
        workflow_id = f"wf_paper_{suffix}"
        hypothesis_id = f"hyp_paper_{suffix}"
        backtest_id = f"bt_paper_{suffix}"
        risk_check_id = f"risk_paper_{suffix}"
        with SessionLocal() as db:
            executable_strategy = {
                "side": "long",
                "entry": {"type": "breakout", "operator": ">=", "price": 100.0, "confirmations": []},
                "exit": {"stop_loss": 98.0, "take_profit_1": 104.0, "take_profit_2": None, "time_stop_bars": 24},
                "risk": {"risk_per_trade": 0.01, "max_position_notional_pct": 1.0},
            }
            db.add(
                Hypothesis(
                    id=hypothesis_id,
                    workflow_id=workflow_id,
                    market_event_id=None,
                    ai_analysis_id=None,
                    agent_run_id=None,
                    symbol="ETH/USDT",
                    timeframe="15m",
                    label="Ledger Strategy",
                    hypothesis_type="long",
                    direction="long",
                    trigger="Breakout",
                    invalidation="Breakdown",
                    risk_note="Paper-only ledger test.",
                    backtest_rule="Rule",
                    suggested_action="Prepare paper execution",
                    entry_condition="Entry",
                    invalid_condition="Invalid",
                    stop_loss=98.0,
                    take_profit=104.0,
                    confidence=80,
                    feasibility=75,
                    risk=25,
                    long_confidence=80,
                    short_confidence=None,
                    summary="Ledger hypothesis",
                    reasons_json=["seeded"],
                    warnings_json=[],
                    raw_json={"structured_hypothesis": {"executable_strategy": executable_strategy}},
                    source="paper_seed",
                    status="ready_for_risk",
                    is_mock=False,
                    provider="seed",
                    model="seed",
                    is_ai_generated=False,
                    analysis_mode="rule_based",
                    bias="long",
                    suggested_rule_json={"executable_strategy": executable_strategy},
                    latest_backtest_result_id=backtest_id,
                    latest_risk_check_id=risk_check_id,
                    created_at=now_utc(),
                    updated_at=now_utc(),
                )
            )
            db.add(
                BacktestResult(
                    id=backtest_id,
                    workflow_id=workflow_id,
                    backtest_job_id=f"btjob_paper_{suffix}",
                    hypothesis_id=hypothesis_id,
                    win_rate=0.6,
                    profit_factor=1.4,
                    expectancy=0.3,
                    max_drawdown=0.08,
                    trade_count=100,
                    avg_rr=2.0,
                    sharpe_ratio=1.0,
                    sample_quality="sufficient",
                    equity_curve_json=[],
                    drawdown_curve_json=[],
                    trade_distribution_json=[],
                    verdict_json={"decision": "pass"},
                    strategy_rule_json={},
                    report_json={},
                    trades_json=[],
                    metrics_json={},
                    source="paper_seed",
                    status="completed",
                    is_mock=False,
                    created_at=now_utc(),
                    updated_at=now_utc(),
                )
            )
            db.add(
                RiskCheck(
                    id=risk_check_id,
                    workflow_id=workflow_id,
                    hypothesis_id=hypothesis_id,
                    backtest_id=backtest_id,
                    decision=decision,
                    risk_level="low" if decision != "REJECTED" else "high",
                    risk_score=20.0 if decision != "REJECTED" else 95.0,
                    account_equity=10000.0,
                    risk_per_trade=0.01,
                    position_size=1.0,
                    entry_price=100.0,
                    stop_loss=98.0,
                    take_profit=104.0,
                    max_loss=2.0,
                    reward_risk=2.0,
                    rule_results_json=[],
                    market_data_status="live",
                    checks_json=[],
                    warnings_json=[],
                    block_reasons_json=["Rejected seed"] if decision == "REJECTED" else [],
                    source="paper_seed",
                    status=decision,
                    is_mock=False,
                    created_at=now_utc(),
                    updated_at=now_utc(),
                )
            )
            db.commit()
        return hypothesis_id, backtest_id, risk_check_id

    def create_order(self, hypothesis_id: str, backtest_id: str, risk_check_id: str, *, order_type: str = "market"):
        return self.client.post(
            "/api/paper-orders",
            json={
                "hypothesis_id": hypothesis_id,
                "backtest_id": backtest_id,
                "risk_check_id": risk_check_id,
                "symbol": "ETH/USDT",
                "side": "buy",
                "order_type": order_type,
                "price": 100,
                "quantity": 1,
                "stop_loss": 98,
                "take_profit": 104,
            },
        )

    def test_draft_order_can_execute_and_writes_fill_position_log(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        create_response = self.create_order(hypothesis_id, backtest_id, risk_check_id)
        self.assertEqual(create_response.status_code, 200, create_response.text)
        order_id = create_response.json()["data"]["id"]

        execute_response = self.client.post(f"/api/paper-orders/{order_id}/execute")
        self.assertEqual(execute_response.status_code, 200, execute_response.text)
        self.assertEqual(execute_response.json()["data"]["status"], "filled")

        with SessionLocal() as db:
            self.assertIsNotNone(db.query(PaperFill).filter(PaperFill.paper_order_id == order_id).first())
            self.assertIsNotNone(db.query(PaperPosition).filter(PaperPosition.risk_check_id == risk_check_id).first())
            self.assertIsNotNone(db.query(PaperExecutionLog).filter(PaperExecutionLog.paper_order_id == order_id, PaperExecutionLog.event_type == "FILL").first())

    def test_rejected_risk_check_cannot_execute(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context(decision="REJECTED")
        with SessionLocal() as db:
            order = PaperOrder(
                id=prefixed_id("po"),
                workflow_id=f"wf_rejected_{uuid4().hex[:8]}",
                hypothesis_id=hypothesis_id,
                backtest_id=backtest_id,
                risk_check_id=risk_check_id,
                symbol="ETH/USDT",
                side="buy",
                order_type="market",
                price=100.0,
                quantity=1.0,
                stop_loss=98.0,
                take_profit=104.0,
                position_size=1.0,
                risk_amount=2.0,
                mode="paper",
                risk_status="REJECTED",
                source="paper_seed",
                status="draft",
                is_mock=False,
                is_real_trade=False,
                execution_mode="paper",
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(order)
            db.commit()
            order_id = order.id

        response = self.client.post(f"/api/paper-orders/{order_id}/execute")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "RISK_BLOCKED")

    def test_missing_risk_check_id_cannot_execute(self) -> None:
        hypothesis_id, backtest_id, _risk_check_id = self.seed_context()
        with SessionLocal() as db:
            order = PaperOrder(
                id=prefixed_id("po"),
                workflow_id=f"wf_missing_{uuid4().hex[:8]}",
                hypothesis_id=hypothesis_id,
                backtest_id=backtest_id,
                risk_check_id="",
                symbol="ETH/USDT",
                side="buy",
                order_type="market",
                price=100.0,
                quantity=1.0,
                source="paper_seed",
                status="draft",
                is_mock=False,
                is_real_trade=False,
                execution_mode="paper",
                mode="paper",
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(order)
            db.commit()
            order_id = order.id

        response = self.client.post(f"/api/paper-orders/{order_id}/execute")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "RISK_CHECK_REQUIRED")

    def test_draft_and_open_can_cancel_but_filled_cannot(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        draft = self.create_order(hypothesis_id, backtest_id, risk_check_id, order_type="limit").json()["data"]
        draft_cancel = self.client.post(f"/api/paper-orders/{draft['id']}/cancel")
        self.assertEqual(draft_cancel.status_code, 200, draft_cancel.text)
        self.assertEqual(draft_cancel.json()["data"]["status"], "cancelled")

        open_order = self.create_order(hypothesis_id, backtest_id, risk_check_id, order_type="limit").json()["data"]
        with SessionLocal() as db:
            order = db.get(PaperOrder, open_order["id"])
            order.status = "open"
            db.commit()
        open_cancel = self.client.post(f"/api/paper-orders/{open_order['id']}/cancel")
        self.assertEqual(open_cancel.status_code, 200, open_cancel.text)

        filled = self.create_order(hypothesis_id, backtest_id, risk_check_id, order_type="market").json()["data"]
        self.client.post(f"/api/paper-orders/{filled['id']}/execute")
        filled_cancel = self.client.post(f"/api/paper-orders/{filled['id']}/cancel")
        self.assertEqual(filled_cancel.status_code, 409)
        self.assertEqual(filled_cancel.json()["error"]["code"], "ORDER_NOT_CANCELABLE")

    def test_getters_return_summaries_and_ledger_fields(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context(decision="APPROVED")
        order = self.create_order(hypothesis_id, backtest_id, risk_check_id).json()["data"]
        self.client.post(f"/api/paper-orders/{order['id']}/execute")

        detail = self.client.get(f"/api/paper-orders/{order['id']}")
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["data"]["risk_check"]["id"], risk_check_id)
        self.assertEqual(detail.json()["data"]["hypothesis"]["id"], hypothesis_id)

        account = self.client.get("/api/paper-account")
        self.assertEqual(account.status_code, 200, account.text)
        for field in ["equity", "available_balance", "used_margin", "unrealized_pnl", "realized_pnl", "daily_loss", "max_daily_loss", "risk_utilization"]:
            self.assertIn(field, account.json()["data"])

        positions = self.client.get("/api/paper-positions")
        self.assertEqual(positions.status_code, 200, positions.text)
        self.assertTrue(positions.json()["data"])
        for field in ["symbol", "side", "quantity", "entry_price", "mark_price", "unrealized_pnl", "stop_loss", "take_profit", "risk_check_id", "hypothesis_id"]:
            self.assertIn(field, positions.json()["data"][0])

        logs = self.client.get(f"/api/paper-execution-logs?paper_order_id={order['id']}")
        self.assertEqual(logs.status_code, 200, logs.text)
        self.assertTrue(logs.json()["data"])
        for field in ["paper_order_id", "hypothesis_id", "risk_check_id", "event_type", "status", "message", "created_at"]:
            self.assertIn(field, logs.json()["data"][0])

    def test_conditional_risk_check_cannot_create_order(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context(decision="CONDITIONAL")
        response = self.create_order(hypothesis_id, backtest_id, risk_check_id)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "RISK_BLOCKED")

    def test_neutral_hypothesis_cannot_create_order(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        with SessionLocal() as db:
            hypothesis = db.get(Hypothesis, hypothesis_id)
            hypothesis.direction = "neutral"
            db.commit()
        response = self.create_order(hypothesis_id, backtest_id, risk_check_id)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "HYPOTHESIS_NOT_TRADEABLE")

    def test_stale_risk_check_cannot_create_order(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        with SessionLocal() as db:
            risk_check = db.get(RiskCheck, risk_check_id)
            risk_check.created_at = now_utc() - timedelta(seconds=90)
            db.commit()
        response = self.create_order(hypothesis_id, backtest_id, risk_check_id)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "RISK_CHECK_STALE")

    def test_market_data_status_not_live_blocks_execution(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        with SessionLocal() as db:
            risk_check = db.get(RiskCheck, risk_check_id)
            risk_check.market_data_status = "unavailable"
            order = PaperOrder(
                id=prefixed_id("po"),
                workflow_id=f"wf_market_{uuid4().hex[:8]}",
                hypothesis_id=hypothesis_id,
                backtest_id=backtest_id,
                risk_check_id=risk_check_id,
                symbol="ETH/USDT",
                side="buy",
                order_type="market",
                price=100.0,
                quantity=1.0,
                stop_loss=98.0,
                take_profit=104.0,
                position_size=1.0,
                risk_amount=2.0,
                mode="paper",
                risk_status="APPROVED",
                source="paper_seed",
                status="draft",
                is_mock=False,
                is_real_trade=False,
                execution_mode="paper",
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(order)
            db.commit()
            order_id = order.id
        response = self.client.post(f"/api/paper-orders/{order_id}/execute")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "MARKET_DATA_NOT_LIVE")

    def test_degraded_orderbook_blocks_execution(self) -> None:
        paper_api.service.market_data = DegradedMarketData()
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        order = self.create_order(hypothesis_id, backtest_id, risk_check_id).json()["data"]
        response = self.client.post(f"/api/paper-orders/{order['id']}/execute")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "MARKET_SOURCE_UNAVAILABLE")

    def test_position_refresh_auto_closes_take_profit(self) -> None:
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        order = self.create_order(hypothesis_id, backtest_id, risk_check_id).json()["data"]
        filled = self.client.post(f"/api/paper-orders/{order['id']}/execute")
        self.assertEqual(filled.status_code, 200, filled.text)
        paper_api.service.market_data = PriceMarketData(104.5)

        positions = self.client.get("/api/paper-positions?status=closed")
        self.assertEqual(positions.status_code, 200, positions.text)
        closed = [item for item in positions.json()["data"] if item["risk_check_id"] == risk_check_id]
        self.assertTrue(closed)
        logs = self.client.get(f"/api/paper-execution-logs?hypothesis_id={hypothesis_id}")
        self.assertEqual(logs.status_code, 200, logs.text)
        self.assertTrue(any(item["event_type"] == "POSITION_AUTO_CLOSE" for item in logs.json()["data"]))

    def test_htx_ticker_unavailable_returns_error_without_fake_fill(self) -> None:
        paper_api.service.market_data = UnavailableMarketData()
        hypothesis_id, backtest_id, risk_check_id = self.seed_context()
        order = self.create_order(hypothesis_id, backtest_id, risk_check_id).json()["data"]

        response = self.client.post(f"/api/paper-orders/{order['id']}/execute")
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(response.json()["error"]["code"], "MARKET_SOURCE_UNAVAILABLE")

        with SessionLocal() as db:
            self.assertIsNone(db.query(PaperFill).filter(PaperFill.paper_order_id == order["id"]).first())
            self.assertIsNone(db.query(PaperPosition).filter(PaperPosition.risk_check_id == risk_check_id).first())
            log = db.query(PaperExecutionLog).filter(PaperExecutionLog.paper_order_id == order["id"], PaperExecutionLog.event_type == "MARKET_SOURCE_UNAVAILABLE").first()
            self.assertIsNotNone(log)


if __name__ == "__main__":
    unittest.main()
