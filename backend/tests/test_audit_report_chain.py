from __future__ import annotations

import sys
import unittest
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import now_utc
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models.hypothesis import Hypothesis


class AuditReportChainTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_report_records_workflow_evidence_chain(self) -> None:
        suffix = uuid4().hex[:10]
        workflow_id = f"wf_audit_{suffix}"
        hypothesis_id = f"hyp_audit_{suffix}"
        with SessionLocal() as db:
            db.add(
                Hypothesis(
                    id=hypothesis_id,
                    workflow_id=workflow_id,
                    market_event_id=None,
                    ai_analysis_id=None,
                    agent_run_id=None,
                    symbol="ETH/USDT",
                    timeframe="15m",
                    label="Audit contract",
                    hypothesis_type="long",
                    direction="long",
                    trigger="Trigger",
                    invalidation="Invalid",
                    risk_note="Paper only",
                    backtest_rule="Rule",
                    suggested_action="Audit",
                    entry_condition="Entry",
                    invalid_condition="Invalid",
                    stop_loss=98,
                    take_profit=104,
                    confidence=70,
                    feasibility=70,
                    risk=20,
                    long_confidence=70,
                    short_confidence=None,
                    summary="Audit contract hypothesis",
                    reasons_json=[],
                    warnings_json=[],
                    raw_json={},
                    source="contract_seed",
                    status="ready_for_backtest",
                    is_mock=False,
                    provider="seed",
                    model="seed",
                    is_ai_generated=False,
                    analysis_mode="rule_based",
                    bias="long",
                    suggested_rule_json={},
                    created_at=now_utc(),
                    updated_at=now_utc(),
                )
            )
            db.commit()
        response = self.client.post("/api/audit-reports", json={"hypothesis_id": hypothesis_id})
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["workflow_id"], workflow_id)
        self.assertGreaterEqual(len(data["events"]), 6)
        self.assertTrue(any(item["entity_type"] == "hypothesis" and item["entity_id"] == hypothesis_id for item in data["events"]))
        self.assertTrue(data["audit_hash"].startswith("0x"))


if __name__ == "__main__":
    unittest.main()
