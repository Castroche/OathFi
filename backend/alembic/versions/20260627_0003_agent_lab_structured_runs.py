"""agent lab structured runs

Revision ID: 20260627_0003
Revises: 20260621_0002
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260627_0003"
down_revision: Union[str, None] = "20260621_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("ai_analysis_id", sa.String(), nullable=True, index=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("current_task", sa.String(), nullable=False),
        sa.Column("input_sources_json", sa.JSON(), nullable=False),
        sa.Column("output_mode", sa.String(), nullable=False),
        sa.Column("confidence_calibration", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("validity", sa.String(), nullable=True),
        sa.Column("overall_confidence", sa.Integer(), nullable=True),
        sa.Column("context_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "strategy_rules",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("hypothesis_id", sa.String(), nullable=False, index=True),
        sa.Column("workflow_id", sa.String(), nullable=False, index=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("strategy_name", sa.String(), nullable=False),
        sa.Column("entry_conditions_json", sa.JSON(), nullable=False),
        sa.Column("exit_conditions_json", sa.JSON(), nullable=False),
        sa.Column("risk_controls_json", sa.JSON(), nullable=False),
        sa.Column("preview_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.add_column("hypotheses", sa.Column("agent_run_id", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("label", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("hypothesis_type", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("trigger", sa.Text(), nullable=True))
    op.add_column("hypotheses", sa.Column("invalidation", sa.Text(), nullable=True))
    op.add_column("hypotheses", sa.Column("risk_note", sa.Text(), nullable=True))
    op.add_column("hypotheses", sa.Column("backtest_rule", sa.Text(), nullable=True))
    op.add_column("hypotheses", sa.Column("suggested_action", sa.Text(), nullable=True))
    op.add_column("hypotheses", sa.Column("raw_json", sa.JSON(), nullable=True))
    op.create_index("ix_hypotheses_agent_run_id", "hypotheses", ["agent_run_id"])


def downgrade() -> None:
    op.drop_index("ix_hypotheses_agent_run_id", table_name="hypotheses")
    op.drop_column("hypotheses", "raw_json")
    op.drop_column("hypotheses", "suggested_action")
    op.drop_column("hypotheses", "backtest_rule")
    op.drop_column("hypotheses", "risk_note")
    op.drop_column("hypotheses", "invalidation")
    op.drop_column("hypotheses", "trigger")
    op.drop_column("hypotheses", "hypothesis_type")
    op.drop_column("hypotheses", "label")
    op.drop_column("hypotheses", "agent_run_id")
    op.drop_table("strategy_rules")
    op.drop_table("agent_runs")
