"""ai translation cache

Revision ID: 20260628_0013
Revises: 20260628_0012
Create Date: 2026-06-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260628_0013"
down_revision: Union[str, None] = "20260628_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if has_table("ai_translation_cache"):
        return
    op.create_table(
        "ai_translation_cache",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("text_hash", sa.String(), nullable=False),
        sa.Column("source_language", sa.String(), nullable=False),
        sa.Column("target_language", sa.String(), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("translated_text", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="completed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("is_mock", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("text_hash", "target_language", name="uq_ai_translation_text_target"),
    )
    op.create_index("ix_ai_translation_cache_text_hash", "ai_translation_cache", ["text_hash"])


def downgrade() -> None:
    if has_table("ai_translation_cache"):
        op.drop_index("ix_ai_translation_cache_text_hash", table_name="ai_translation_cache")
        op.drop_table("ai_translation_cache")
