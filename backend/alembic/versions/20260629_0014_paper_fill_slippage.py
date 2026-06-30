"""add paper fill slippage

Revision ID: 20260629_0014
Revises: 20260628_0013
Create Date: 2026-06-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260629_0014"
down_revision = "20260628_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("paper_fills", sa.Column("slippage", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("paper_fills", "slippage")
