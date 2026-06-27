from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text

from app.db.base import Base, TimestampMixin


class MarketEvent(Base, TimestampMixin):
    __tablename__ = "market_events"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    event_type = Column(String, nullable=False)
    detected_at = Column(DateTime, nullable=True, index=True)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    severity = Column(Integer, nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
    raw_payload_json = Column(JSON, nullable=True)
