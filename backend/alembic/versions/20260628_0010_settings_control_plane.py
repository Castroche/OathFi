"""settings control plane

Revision ID: 20260628_0010
Revises: 20260628_0009
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260628_0010"
down_revision: Union[str, None] = "20260628_0009"
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
    add_column_if_missing("user_settings", sa.Column("primary_data_source", sa.String(), nullable=False, server_default="HTX"))
    add_column_if_missing("user_settings", sa.Column("connection_type", sa.String(), nullable=False, server_default="Hybrid"))
    add_column_if_missing("user_settings", sa.Column("fallback_method", sa.String(), nullable=False, server_default="REST fallback"))
    add_column_if_missing("user_settings", sa.Column("latency_monitor_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("latency_warning_ms", sa.Integer(), nullable=False, server_default="800"))
    add_column_if_missing("user_settings", sa.Column("latency_critical_ms", sa.Integer(), nullable=False, server_default="2000"))
    add_column_if_missing("user_settings", sa.Column("auto_reconnect_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("model_provider", sa.String(), nullable=False, server_default="deepseek"))
    add_column_if_missing("user_settings", sa.Column("model_name", sa.String(), nullable=False, server_default="deepseek-v4-flash"))
    add_column_if_missing("user_settings", sa.Column("output_mode", sa.String(), nullable=False, server_default="Structured"))
    add_column_if_missing("user_settings", sa.Column("confidence_calibration", sa.String(), nullable=False, server_default="Balanced"))
    add_column_if_missing("user_settings", sa.Column("structured_hypothesis_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("default_confidence_bands", sa.JSON(), nullable=False, server_default='{"low":35,"medium":65,"high":85}'))
    add_column_if_missing("user_settings", sa.Column("max_risk_per_trade", sa.Float(), nullable=False, server_default="0.01"))
    add_column_if_missing("user_settings", sa.Column("max_daily_loss", sa.Float(), nullable=False, server_default="0.03"))
    add_column_if_missing("user_settings", sa.Column("max_consecutive_losses", sa.Integer(), nullable=False, server_default="3"))
    add_column_if_missing("user_settings", sa.Column("position_size_mode", sa.String(), nullable=False, server_default="Risk Based"))
    add_column_if_missing("user_settings", sa.Column("stop_loss_enforcement", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("live_trading_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    add_column_if_missing("user_settings", sa.Column("demo_mode_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("use_sample_account", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("paper_execution_only", sa.Boolean(), nullable=False, server_default=sa.true()))
    add_column_if_missing("user_settings", sa.Column("guided_demo_flow", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.execute("UPDATE user_settings SET live_trading_enabled = false, real_trading_enabled = false")
    op.execute("UPDATE user_settings SET model_provider = 'deepseek', model_name = 'deepseek-v4-flash', default_ai_provider = 'deepseek' WHERE model_provider IN ('OpenAI', 'DeepSeek', '') OR model_name = 'gpt-4.1-mini'")


def downgrade() -> None:
    for column in [
        "guided_demo_flow",
        "paper_execution_only",
        "use_sample_account",
        "demo_mode_enabled",
        "live_trading_enabled",
        "stop_loss_enforcement",
        "position_size_mode",
        "max_consecutive_losses",
        "max_daily_loss",
        "max_risk_per_trade",
        "default_confidence_bands",
        "structured_hypothesis_enabled",
        "confidence_calibration",
        "output_mode",
        "model_name",
        "model_provider",
        "auto_reconnect_enabled",
        "latency_critical_ms",
        "latency_warning_ms",
        "latency_monitor_enabled",
        "fallback_method",
        "connection_type",
        "primary_data_source",
    ]:
        if has_column("user_settings", column):
            op.drop_column("user_settings", column)
