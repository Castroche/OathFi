"""user api credentials

Revision ID: 20260628_0011
Revises: 20260628_0010
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260628_0011"
down_revision: Union[str, None] = "20260628_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if has_table("user_api_credentials"):
        return
    op.create_table(
        "user_api_credentials",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("encrypted_api_key", sa.String(), nullable=True),
        sa.Column("encrypted_secret", sa.String(), nullable=True),
        sa.Column("encrypted_extra_json", sa.String(), nullable=True),
        sa.Column("base_url", sa.String(), nullable=True),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider"),
    )
    op.create_index(op.f("ix_user_api_credentials_provider"), "user_api_credentials", ["provider"], unique=True)


def downgrade() -> None:
    if has_table("user_api_credentials"):
        op.drop_index(op.f("ix_user_api_credentials_provider"), table_name="user_api_credentials")
        op.drop_table("user_api_credentials")
