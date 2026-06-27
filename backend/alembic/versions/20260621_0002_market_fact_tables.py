"""market fact tables

Revision ID: 20260621_0002
Revises: 20260620_0001
Create Date: 2026-06-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260621_0002"
down_revision: Union[str, None] = "20260620_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "symbols",
        sa.Column("symbol", sa.String(), primary_key=True),
        sa.Column("base_asset", sa.String(), nullable=False),
        sa.Column("quote_asset", sa.String(), nullable=False),
        sa.Column("exchange_symbol", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("exchange", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("price_precision", sa.Integer(), nullable=True),
        sa.Column("amount_precision", sa.Integer(), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "market_snapshots",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("open_24h", sa.Float(), nullable=True),
        sa.Column("high_24h", sa.Float(), nullable=True),
        sa.Column("low_24h", sa.Float(), nullable=True),
        sa.Column("volume_base_24h", sa.Float(), nullable=True),
        sa.Column("volume_quote_24h", sa.Float(), nullable=True),
        sa.Column("change_pct_24h", sa.Float(), nullable=True),
        sa.Column("funding_rate", sa.Float(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("raw_payload_json", sa.JSON(), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "klines",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("interval", sa.String(), nullable=False, index=True),
        sa.Column("open_time", sa.DateTime(), nullable=False, index=True),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=False),
        sa.Column("turnover", sa.Float(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("symbol", "interval", "open_time", "source", name="uq_klines_symbol_interval_open_source"),
    )
    op.create_table(
        "orderbook_snapshots",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("bids_json", sa.JSON(), nullable=False),
        sa.Column("asks_json", sa.JSON(), nullable=False),
        sa.Column("spread", sa.Float(), nullable=False),
        sa.Column("mid_price", sa.Float(), nullable=False),
        sa.Column("imbalance", sa.Float(), nullable=False),
        sa.Column("liquidity_score", sa.Float(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("raw_payload_json", sa.JSON(), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "trade_ticks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("trade_id", sa.String(), nullable=False, index=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("traded_at", sa.DateTime(), nullable=False, index=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("side", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("raw_payload_json", sa.JSON(), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("trade_id", "symbol", "source", name="uq_trade_ticks_trade_symbol_source"),
    )
    op.add_column("market_events", sa.Column("detected_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("market_events", "detected_at")
    op.drop_table("trade_ticks")
    op.drop_table("orderbook_snapshots")
    op.drop_table("klines")
    op.drop_table("market_snapshots")
    op.drop_table("symbols")

