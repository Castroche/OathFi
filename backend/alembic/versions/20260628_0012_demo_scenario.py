"""demo scenario setting

Revision ID: 20260628_0012
Revises: 20260628_0011
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260628_0012"
down_revision: Union[str, None] = "20260628_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names() and column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not has_column("user_settings", "demo_scenario"):
        op.add_column("user_settings", sa.Column("demo_scenario", sa.String(), nullable=False, server_default="pass"))


def downgrade() -> None:
    if has_column("user_settings", "demo_scenario"):
        op.drop_column("user_settings", "demo_scenario")
