"""initial backend schema

Revision ID: 20260620_0001
Revises:
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260620_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "market_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=True, index=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.Column("raw_payload_json", sa.JSON(), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "ai_analyses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=True, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("task", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("input_json", sa.JSON(), nullable=False),
        sa.Column("output_json", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("token_usage_json", sa.JSON(), nullable=True),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "hypotheses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("market_event_id", sa.String(), nullable=True),
        sa.Column("ai_analysis_id", sa.String(), nullable=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("entry_condition", sa.Text(), nullable=False),
        sa.Column("invalid_condition", sa.Text(), nullable=False),
        sa.Column("stop_loss", sa.Float(), nullable=True),
        sa.Column("take_profit", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("feasibility", sa.Integer(), nullable=False),
        sa.Column("risk", sa.Integer(), nullable=False),
        sa.Column("long_confidence", sa.Integer(), nullable=True),
        sa.Column("short_confidence", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("reasons_json", sa.JSON(), nullable=False),
        sa.Column("warnings_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "backtest_jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("hypothesis_id", sa.String(), nullable=False, index=True),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("initial_capital", sa.Float(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "backtest_results",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("backtest_job_id", sa.String(), nullable=False, index=True),
        sa.Column("hypothesis_id", sa.String(), nullable=False, index=True),
        sa.Column("win_rate", sa.Float(), nullable=False),
        sa.Column("profit_factor", sa.Float(), nullable=False),
        sa.Column("expectancy", sa.Float(), nullable=False),
        sa.Column("max_drawdown", sa.Float(), nullable=False),
        sa.Column("trade_count", sa.Integer(), nullable=False),
        sa.Column("avg_rr", sa.Float(), nullable=False),
        sa.Column("sample_quality", sa.String(), nullable=False),
        sa.Column("equity_curve_json", sa.JSON(), nullable=False),
        sa.Column("trades_json", sa.JSON(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "risk_checks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("hypothesis_id", sa.String(), nullable=False, index=True),
        sa.Column("backtest_id", sa.String(), nullable=True),
        sa.Column("decision", sa.String(), nullable=False),
        sa.Column("account_equity", sa.Float(), nullable=False),
        sa.Column("risk_per_trade", sa.Float(), nullable=False),
        sa.Column("position_size", sa.Float(), nullable=False),
        sa.Column("entry_price", sa.Float(), nullable=False),
        sa.Column("stop_loss", sa.Float(), nullable=False),
        sa.Column("take_profit", sa.Float(), nullable=True),
        sa.Column("checks_json", sa.JSON(), nullable=False),
        sa.Column("warnings_json", sa.JSON(), nullable=False),
        sa.Column("block_reasons_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "paper_orders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("hypothesis_id", sa.String(), nullable=False, index=True),
        sa.Column("backtest_id", sa.String(), nullable=True),
        sa.Column("risk_check_id", sa.String(), nullable=False, index=True),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("side", sa.String(), nullable=False),
        sa.Column("order_type", sa.String(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("stop_loss", sa.Float(), nullable=True),
        sa.Column("take_profit", sa.Float(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.Column("is_real_trade", sa.Boolean(), nullable=False),
        sa.Column("execution_mode", sa.String(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "audit_reports",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("hypothesis_id", sa.String(), nullable=False, index=True),
        sa.Column("backtest_id", sa.String(), nullable=True),
        sa.Column("risk_check_id", sa.String(), nullable=True),
        sa.Column("paper_order_id", sa.String(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("market_context_json", sa.JSON(), nullable=False),
        sa.Column("hypothesis_json", sa.JSON(), nullable=False),
        sa.Column("backtest_json", sa.JSON(), nullable=False),
        sa.Column("risk_json", sa.JSON(), nullable=False),
        sa.Column("paper_execution_json", sa.JSON(), nullable=False),
        sa.Column("final_decision", sa.String(), nullable=False),
        sa.Column("lessons_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "user_settings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("default_symbol", sa.String(), nullable=False),
        sa.Column("default_timeframe", sa.String(), nullable=False),
        sa.Column("demo_mode", sa.Boolean(), nullable=False),
        sa.Column("default_ai_provider", sa.String(), nullable=False),
        sa.Column("paper_trading_enabled", sa.Boolean(), nullable=False),
        sa.Column("real_trading_enabled", sa.Boolean(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("settings_json", sa.JSON(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "action_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=True, index=True),
        sa.Column("action_type", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("action_logs")
    op.drop_table("user_settings")
    op.drop_table("audit_reports")
    op.drop_table("paper_orders")
    op.drop_table("risk_checks")
    op.drop_table("backtest_results")
    op.drop_table("backtest_jobs")
    op.drop_table("hypotheses")
    op.drop_table("ai_analyses")
    op.drop_table("market_events")
