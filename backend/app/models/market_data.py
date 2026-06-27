from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, Text, UniqueConstraint

from app.db.base import Base, TimestampMixin


class Symbol(Base, TimestampMixin):
    __tablename__ = "symbols"

    symbol = Column(String, primary_key=True)
    base_asset = Column(String, nullable=False)
    quote_asset = Column(String, nullable=False)
    exchange_symbol = Column(String, nullable=False, unique=True, index=True)
    exchange = Column(String, default="htx", nullable=False)
    status = Column(String, default="unknown", nullable=False)
    price_precision = Column(Integer, nullable=True)
    amount_precision = Column(Integer, nullable=True)


class MarketSnapshot(Base, TimestampMixin):
    __tablename__ = "market_snapshots"

    id = Column(String, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    price = Column(Float, nullable=False)
    open_24h = Column(Float, nullable=True)
    high_24h = Column(Float, nullable=True)
    low_24h = Column(Float, nullable=True)
    volume_base_24h = Column(Float, nullable=True)
    volume_quote_24h = Column(Float, nullable=True)
    change_pct_24h = Column(Float, nullable=True)
    funding_rate = Column(Float, nullable=True)
    source = Column(String, nullable=False)
    status = Column(String, nullable=False)
    latency_ms = Column(Integer, nullable=True)
    raw_payload_json = Column(JSON, nullable=True)


class Kline(Base, TimestampMixin):
    __tablename__ = "klines"
    __table_args__ = (UniqueConstraint("symbol", "interval", "open_time", "source", name="uq_klines_symbol_interval_open_source"),)

    id = Column(String, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    interval = Column(String, nullable=False, index=True)
    open_time = Column(DateTime, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    turnover = Column(Float, nullable=True)
    source = Column(String, nullable=False)


class OrderBookSnapshot(Base, TimestampMixin):
    __tablename__ = "orderbook_snapshots"

    id = Column(String, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    bids_json = Column(JSON, nullable=False)
    asks_json = Column(JSON, nullable=False)
    spread = Column(Float, nullable=False)
    mid_price = Column(Float, nullable=False)
    imbalance = Column(Float, nullable=False)
    liquidity_score = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    raw_payload_json = Column(JSON, nullable=True)


class TradeTick(Base, TimestampMixin):
    __tablename__ = "trade_ticks"
    __table_args__ = (UniqueConstraint("trade_id", "symbol", "source", name="uq_trade_ticks_trade_symbol_source"),)

    id = Column(String, primary_key=True)
    trade_id = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    traded_at = Column(DateTime, nullable=False, index=True)
    price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    side = Column(String, nullable=False)
    source = Column(String, nullable=False)
    raw_payload_json = Column(JSON, nullable=True)

