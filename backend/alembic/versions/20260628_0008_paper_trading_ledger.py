"""paper trading ledger

Revision ID: 20260628_0008
Revises: 20260627_0007
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260628_0008"
down_revision: Union[str, None] = "20260627_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def has_column(table_name: str, column_name: str) -> bool:
    if not has_table(table_name):
        return False
    return column_name in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if not has_column(table_name, column.name):
        op.add_column(table_name, column)


def upgrade() -> None:
    add_column_if_missing("backtest_results", sa.Column("sharpe_ratio", sa.Float(), nullable=False, server_default="0"))
    add_column_if_missing("backtest_results", sa.Column("drawdown_curve_json", sa.JSON(), nullable=False, server_default="[]"))
    add_column_if_missing("backtest_results", sa.Column("trade_distribution_json", sa.JSON(), nullable=False, server_default="[]"))
    add_column_if_missing("backtest_results", sa.Column("verdict_json", sa.JSON(), nullable=False, server_default="{}"))
    add_column_if_missing("backtest_results", sa.Column("strategy_rule_json", sa.JSON(), nullable=False, server_default="{}"))
    add_column_if_missing("backtest_results", sa.Column("report_json", sa.JSON(), nullable=False, server_default="{}"))

    add_column_if_missing("paper_orders", sa.Column("position_size", sa.Float(), nullable=True))
    add_column_if_missing("paper_orders", sa.Column("risk_amount", sa.Float(), nullable=True))
    add_column_if_missing("paper_orders", sa.Column("mode", sa.String(), nullable=False, server_default="paper"))
    add_column_if_missing("paper_orders", sa.Column("risk_status", sa.String(), nullable=True))
    add_column_if_missing("paper_orders", sa.Column("submitted_at", sa.DateTime(), nullable=True))
    add_column_if_missing("paper_orders", sa.Column("filled_at", sa.DateTime(), nullable=True))
    add_column_if_missing("paper_orders", sa.Column("cancelled_at", sa.DateTime(), nullable=True))

    if not has_table("paper_accounts"):
        op.create_table(
            "paper_accounts",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("equity", sa.Float(), nullable=False, server_default="10000"),
            sa.Column("available_balance", sa.Float(), nullable=False, server_default="10000"),
            sa.Column("used_margin", sa.Float(), nullable=False, server_default="0"),
            sa.Column("unrealized_pnl", sa.Float(), nullable=False, server_default="0"),
            sa.Column("realized_pnl", sa.Float(), nullable=False, server_default="0"),
            sa.Column("daily_loss", sa.Float(), nullable=False, server_default="0"),
            sa.Column("max_daily_loss", sa.Float(), nullable=False, server_default="500"),
            sa.Column("risk_utilization", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    if not has_table("paper_fills"):
        op.create_table(
            "paper_fills",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("paper_order_id", sa.String(), nullable=False),
            sa.Column("symbol", sa.String(), nullable=False),
            sa.Column("side", sa.String(), nullable=False),
            sa.Column("quantity", sa.Float(), nullable=False),
            sa.Column("fill_price", sa.Float(), nullable=False),
            sa.Column("fee", sa.Float(), nullable=False, server_default="0"),
            sa.Column("liquidity_type", sa.String(), nullable=False, server_default="simulated"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_paper_fills_paper_order_id"), "paper_fills", ["paper_order_id"], unique=False)
        op.create_index(op.f("ix_paper_fills_symbol"), "paper_fills", ["symbol"], unique=False)

    if not has_table("paper_positions"):
        op.create_table(
            "paper_positions",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("symbol", sa.String(), nullable=False),
            sa.Column("side", sa.String(), nullable=False),
            sa.Column("quantity", sa.Float(), nullable=False),
            sa.Column("entry_price", sa.Float(), nullable=False),
            sa.Column("mark_price", sa.Float(), nullable=False),
            sa.Column("unrealized_pnl", sa.Float(), nullable=False, server_default="0"),
            sa.Column("stop_loss", sa.Float(), nullable=True),
            sa.Column("take_profit", sa.Float(), nullable=True),
            sa.Column("risk_check_id", sa.String(), nullable=False),
            sa.Column("hypothesis_id", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="open"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_paper_positions_hypothesis_id"), "paper_positions", ["hypothesis_id"], unique=False)
        op.create_index(op.f("ix_paper_positions_risk_check_id"), "paper_positions", ["risk_check_id"], unique=False)
        op.create_index(op.f("ix_paper_positions_symbol"), "paper_positions", ["symbol"], unique=False)

    if not has_table("paper_execution_logs"):
        op.create_table(
            "paper_execution_logs",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("paper_order_id", sa.String(), nullable=True),
            sa.Column("hypothesis_id", sa.String(), nullable=True),
            sa.Column("risk_check_id", sa.String(), nullable=True),
            sa.Column("event_type", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_paper_execution_logs_hypothesis_id"), "paper_execution_logs", ["hypothesis_id"], unique=False)
        op.create_index(op.f("ix_paper_execution_logs_paper_order_id"), "paper_execution_logs", ["paper_order_id"], unique=False)
        op.create_index(op.f("ix_paper_execution_logs_risk_check_id"), "paper_execution_logs", ["risk_check_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_paper_execution_logs_risk_check_id"), table_name="paper_execution_logs")
    op.drop_index(op.f("ix_paper_execution_logs_paper_order_id"), table_name="paper_execution_logs")
    op.drop_index(op.f("ix_paper_execution_logs_hypothesis_id"), table_name="paper_execution_logs")
    op.drop_table("paper_execution_logs")
    op.drop_index(op.f("ix_paper_positions_symbol"), table_name="paper_positions")
    op.drop_index(op.f("ix_paper_positions_risk_check_id"), table_name="paper_positions")
    op.drop_index(op.f("ix_paper_positions_hypothesis_id"), table_name="paper_positions")
    op.drop_table("paper_positions")
    op.drop_index(op.f("ix_paper_fills_symbol"), table_name="paper_fills")
    op.drop_index(op.f("ix_paper_fills_paper_order_id"), table_name="paper_fills")
    op.drop_table("paper_fills")
    op.drop_table("paper_accounts")
    op.drop_column("paper_orders", "cancelled_at")
    op.drop_column("paper_orders", "filled_at")
    op.drop_column("paper_orders", "submitted_at")
    op.drop_column("paper_orders", "risk_status")
    op.drop_column("paper_orders", "mode")
    op.drop_column("paper_orders", "risk_amount")
    op.drop_column("paper_orders", "position_size")
    op.drop_column("backtest_results", "report_json")
    op.drop_column("backtest_results", "strategy_rule_json")
    op.drop_column("backtest_results", "verdict_json")
    op.drop_column("backtest_results", "trade_distribution_json")
    op.drop_column("backtest_results", "drawdown_curve_json")
    op.drop_column("backtest_results", "sharpe_ratio")
