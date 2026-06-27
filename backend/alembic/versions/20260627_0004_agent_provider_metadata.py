"""agent provider metadata

Revision ID: 20260627_0004
Revises: 20260627_0003
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260627_0004"
down_revision: Union[str, None] = "20260627_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("agent_runs", sa.Column("provider", sa.String(), nullable=True))
    op.add_column("agent_runs", sa.Column("model", sa.String(), nullable=True))
    op.add_column("agent_runs", sa.Column("provider_configured", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("agent_runs", sa.Column("provider_healthy", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("agent_runs", sa.Column("analysis_mode", sa.String(), nullable=False, server_default="ai"))
    op.add_column("agent_runs", sa.Column("raw_output_preview", sa.Text(), nullable=True))
    op.add_column("agent_runs", sa.Column("error_type", sa.String(), nullable=True))
    op.add_column("agent_runs", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column("agent_runs", sa.Column("context_loaded", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("agent_runs", sa.Column("is_mock_context", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.add_column("hypotheses", sa.Column("provider", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("model", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("hypotheses", sa.Column("analysis_mode", sa.String(), nullable=False, server_default="ai"))
    op.add_column("hypotheses", sa.Column("bias", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("suggested_rule_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("hypotheses", "suggested_rule_json")
    op.drop_column("hypotheses", "bias")
    op.drop_column("hypotheses", "analysis_mode")
    op.drop_column("hypotheses", "is_ai_generated")
    op.drop_column("hypotheses", "model")
    op.drop_column("hypotheses", "provider")

    op.drop_column("agent_runs", "is_mock_context")
    op.drop_column("agent_runs", "context_loaded")
    op.drop_column("agent_runs", "error_message")
    op.drop_column("agent_runs", "error_type")
    op.drop_column("agent_runs", "raw_output_preview")
    op.drop_column("agent_runs", "analysis_mode")
    op.drop_column("agent_runs", "provider_healthy")
    op.drop_column("agent_runs", "provider_configured")
    op.drop_column("agent_runs", "model")
    op.drop_column("agent_runs", "provider")
