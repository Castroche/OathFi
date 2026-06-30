from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.db.base import now_utc, prefixed_id
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.paper_order import PaperExecutionLog, PaperOrder
from app.models.risk_check import RiskCheck


def seed_case(decision: str, *, order_status: str = "draft", order_type: str = "market") -> dict:
    suffix = uuid4().hex[:10]
    workflow_id = f"wf_pe2e_{suffix}"
    hypothesis_id = f"hyp_pe2e_{suffix}"
    backtest_id = f"bt_pe2e_{suffix}"
    risk_check_id = f"risk_pe2e_{suffix}"
    order_id = f"po_pe2e_{suffix}"
    with SessionLocal() as db:
        hypothesis = Hypothesis(
            id=hypothesis_id,
            workflow_id=workflow_id,
            market_event_id=None,
            ai_analysis_id=None,
            agent_run_id=None,
            symbol="ETH/USDT",
            timeframe="15m",
            label=f"Paper E2E {decision}",
            hypothesis_type="long",
            direction="long",
            trigger="Seeded trigger",
            invalidation="Seeded invalidation",
            risk_note="Paper-only execution seed.",
            backtest_rule="Seeded rule",
            suggested_action="Execute in paper ledger",
            entry_condition="Entry",
            invalid_condition="Invalid",
            stop_loss=98.0,
            take_profit=104.0,
            confidence=82,
            feasibility=74,
            risk=25,
            long_confidence=82,
            short_confidence=None,
            summary=f"Paper E2E {decision} hypothesis",
            reasons_json=["paper execution e2e seed"],
            warnings_json=["Conditional risk requires review"] if decision == "CONDITIONAL" else [],
            raw_json={},
            source="paper_e2e_seed",
            status="ready_for_execution",
            is_mock=False,
            provider="seed",
            model="seed",
            is_ai_generated=False,
            analysis_mode="rule_based",
            bias="long",
            suggested_rule_json={},
            latest_backtest_result_id=backtest_id,
            latest_risk_check_id=risk_check_id,
            latest_paper_order_id=order_id,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        backtest = BacktestResult(
            id=backtest_id,
            workflow_id=workflow_id,
            backtest_job_id=f"btjob_pe2e_{suffix}",
            hypothesis_id=hypothesis_id,
            win_rate=0.6,
            profit_factor=1.45,
            expectancy=0.3,
            max_drawdown=0.13 if decision == "CONDITIONAL" else 0.05,
            trade_count=100,
            avg_rr=2.0,
            sharpe_ratio=1.1,
            sample_quality="sufficient",
            equity_curve_json=[],
            drawdown_curve_json=[],
            trade_distribution_json=[],
            verdict_json={},
            strategy_rule_json={},
            report_json={},
            trades_json=[],
            metrics_json={"sample_size": 100},
            source="paper_e2e_seed",
            status="completed",
            is_mock=False,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        risk = RiskCheck(
            id=risk_check_id,
            workflow_id=workflow_id,
            hypothesis_id=hypothesis_id,
            backtest_id=backtest_id,
            decision=decision,
            risk_level="medium" if decision == "CONDITIONAL" else "high",
            risk_score=64 if decision == "CONDITIONAL" else 94,
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
            warnings_json=["Conditional risk requires review"] if decision == "CONDITIONAL" else [],
            block_reasons_json=["Rejected seed"] if decision == "REJECTED" else [],
            source="paper_e2e_seed",
            status=decision,
            is_mock=False,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        order = PaperOrder(
            id=order_id,
            workflow_id=workflow_id,
            hypothesis_id=hypothesis_id,
            backtest_id=backtest_id,
            risk_check_id=risk_check_id,
            symbol="ETH/USDT",
            side="buy",
            order_type=order_type,
            price=100.0,
            quantity=1.0,
            stop_loss=98.0,
            take_profit=104.0,
            position_size=1.0,
            risk_amount=2.0,
            mode="paper",
            risk_status=decision,
            source="paper_e2e_seed",
            status=order_status,
            is_mock=False,
            is_real_trade=False,
            execution_mode="paper",
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        log = PaperExecutionLog(
            id=prefixed_id("elog"),
            paper_order_id=order_id,
            hypothesis_id=hypothesis_id,
            risk_check_id=risk_check_id,
            event_type="ORDER_DRAFTED",
            status=order_status,
            message="Seeded paper execution order for browser contract test.",
            metadata_json={"seed": True},
            created_at=now_utc(),
        )
        db.add_all([hypothesis, backtest, risk, order, log])
        db.commit()
    return {
        "hypothesis_id": hypothesis_id,
        "backtest_id": backtest_id,
        "risk_check_id": risk_check_id,
        "paper_order_id": order_id,
    }


def main() -> None:
    init_db()
    conditional = seed_case("CONDITIONAL")
    cancel = seed_case("APPROVED")
    rejected = seed_case("REJECTED")
    print(json.dumps({"conditional": conditional, "cancel": cancel, "rejected": rejected}, ensure_ascii=False))


if __name__ == "__main__":
    main()
