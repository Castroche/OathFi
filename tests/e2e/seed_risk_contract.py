from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.db.base import now_utc
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.backtest import BacktestResult
from app.models.hypothesis import Hypothesis
from app.models.risk_check import RiskCheck


def base_rule(name: str, status: str, threshold: str, actual: str) -> dict:
    return {
        "name": name,
        "status": status,
        "message": f"{name}: {actual} vs {threshold}",
        "threshold": threshold,
        "actual": actual,
    }


def create_contract_case(decision: str, *, unavailable_market: bool = False) -> dict:
    suffix = uuid4().hex[:10]
    workflow_id = f"wf_e2e_{suffix}"
    hypothesis_id = f"hyp_e2e_{suffix}"
    backtest_id = f"bt_e2e_{suffix}"
    risk_check_id = f"risk_e2e_{suffix}"
    status = "ready_for_risk" if decision != "REJECTED" else "risk_rejected"
    warnings = ["Market data unavailable; downgraded to conditional."] if unavailable_market else []
    blocks = ["expectancy <= 0", "profit_factor < 1.2"] if decision == "REJECTED" else []
    rule_results = [
        base_rule("expectancy_positive", "PASS" if decision != "REJECTED" else "BLOCK", "> 0", "0.42" if decision != "REJECTED" else "-0.08"),
        base_rule("profit_factor", "PASS" if decision != "REJECTED" else "BLOCK", ">= 1.2", "1.55" if decision != "REJECTED" else "0.82"),
        base_rule("max_drawdown", "WARNING" if decision == "CONDITIONAL" else "PASS", "<= 12%", "13%" if decision == "CONDITIONAL" else "5%"),
        base_rule("market_data_available", "WARNING" if unavailable_market else "PASS", "live", "unavailable" if unavailable_market else "live"),
    ]
    with SessionLocal() as db:
        hypothesis = Hypothesis(
            id=hypothesis_id,
            workflow_id=workflow_id,
            market_event_id=None,
            ai_analysis_id=None,
            agent_run_id=None,
            symbol="ETH/USDT",
            timeframe="15m",
            label=f"E2E {decision} Hypothesis",
            hypothesis_type="long",
            direction="long",
            trigger="Contract test entry trigger.",
            invalidation="Contract test invalidation.",
            risk_note="Paper-only contract e2e seed.",
            backtest_rule="Contract seeded rule",
            suggested_action="Review risk firewall",
            entry_condition="Close above support",
            invalid_condition="Break below support",
            stop_loss=98.0,
            take_profit=104.0,
            confidence=80,
            feasibility=75,
            risk=25,
            long_confidence=80,
            short_confidence=None,
            summary=f"E2E seeded {decision} hypothesis",
            reasons_json=["contract regression seed"],
            warnings_json=warnings,
            raw_json={},
            source="e2e_seed",
            status=status,
            is_mock=False,
            provider="seed",
            model="seed",
            is_ai_generated=False,
            analysis_mode="rule_based",
            bias="long",
            suggested_rule_json={},
            latest_backtest_result_id=backtest_id,
            latest_risk_check_id=risk_check_id,
            latest_paper_order_id=None,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        backtest = BacktestResult(
            id=backtest_id,
            workflow_id=workflow_id,
            backtest_job_id=f"btjob_e2e_{suffix}",
            hypothesis_id=hypothesis_id,
            win_rate=0.6,
            profit_factor=1.55 if decision != "REJECTED" else 0.82,
            expectancy=0.42 if decision != "REJECTED" else -0.08,
            max_drawdown=0.13 if decision == "CONDITIONAL" else 0.05,
            trade_count=100 if decision != "REJECTED" else 12,
            avg_rr=2.0,
            sharpe_ratio=1.1,
            sample_quality="sufficient" if decision != "REJECTED" else "insufficient",
            equity_curve_json=[],
            drawdown_curve_json=[],
            trade_distribution_json=[],
            verdict_json={},
            strategy_rule_json={},
            report_json={},
            trades_json=[],
            metrics_json={"sample_size": 100 if decision != "REJECTED" else 12},
            source="e2e_seed",
            status="completed",
            is_mock=False,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        risk_check = RiskCheck(
            id=risk_check_id,
            workflow_id=workflow_id,
            hypothesis_id=hypothesis_id,
            backtest_id=backtest_id,
            decision=decision,
            risk_level="medium" if decision == "CONDITIONAL" else ("high" if decision == "REJECTED" else "low"),
            risk_score=63 if decision == "CONDITIONAL" else (24 if decision == "REJECTED" else 88),
            account_equity=10000.0,
            risk_per_trade=0.01,
            position_size=5.0,
            entry_price=100.0,
            stop_loss=98.0,
            take_profit=104.0,
            max_loss=100.0,
            reward_risk=2.0,
            rule_results_json=rule_results,
            market_data_status="unavailable" if unavailable_market else "live",
            checks_json=rule_results,
            warnings_json=warnings,
            block_reasons_json=blocks,
            source="e2e_seed",
            status="completed",
            is_mock=False,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add_all([hypothesis, backtest, risk_check])
        db.commit()
    return {
        "hypothesis_id": hypothesis_id,
        "backtest_id": backtest_id,
        "risk_check_id": risk_check_id,
    }


def main() -> None:
    init_db()
    conditional = create_contract_case("CONDITIONAL", unavailable_market=True)
    rejected = create_contract_case("REJECTED")
    print(json.dumps({"conditional": conditional, "rejected": rejected}, ensure_ascii=False))


if __name__ == "__main__":
    main()
