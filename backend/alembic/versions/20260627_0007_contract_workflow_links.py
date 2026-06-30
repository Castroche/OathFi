"""contract workflow links

Revision ID: 20260627_0007
Revises: 20260627_0004
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260627_0007"
down_revision: Union[str, None] = "20260627_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("hypotheses", sa.Column("latest_backtest_result_id", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("latest_risk_check_id", sa.String(), nullable=True))
    op.add_column("hypotheses", sa.Column("latest_paper_order_id", sa.String(), nullable=True))
    op.add_column("risk_checks", sa.Column("market_data_status", sa.String(), nullable=False, server_default="live"))


def downgrade() -> None:
    op.drop_column("risk_checks", "market_data_status")
    op.drop_column("hypotheses", "latest_paper_order_id")
    op.drop_column("hypotheses", "latest_risk_check_id")
    op.drop_column("hypotheses", "latest_backtest_result_id")
