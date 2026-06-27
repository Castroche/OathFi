from sqlalchemy import Boolean, Column, Integer, JSON, String, Text

from app.db.base import Base, TimestampMixin


class AIAnalysis(Base, TimestampMixin):
    __tablename__ = "ai_analyses"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=True, index=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    task = Column(String, nullable=False)
    source = Column(String, default="backend", nullable=False)
    input_json = Column(JSON, nullable=False)
    output_json = Column(JSON, nullable=False)
    summary = Column(Text, nullable=False)
    confidence = Column(Integer, nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    token_usage_json = Column(JSON, nullable=True)
    is_mock = Column(Boolean, default=False, nullable=False)
