from sqlalchemy import Boolean, Column, Integer, JSON, String, Text

from app.db.base import Base, TimestampMixin


class AgentRun(Base, TimestampMixin):
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    ai_analysis_id = Column(String, nullable=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    timeframe = Column(String, nullable=False)
    current_task = Column(String, nullable=False)
    input_sources_json = Column(JSON, nullable=False)
    output_mode = Column(String, default="json", nullable=False)
    confidence_calibration = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    validity = Column(String, nullable=True)
    overall_confidence = Column(Integer, nullable=True)
    context_json = Column(JSON, nullable=False)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="running", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
    provider = Column(String, nullable=True)
    model = Column(String, nullable=True)
    provider_configured = Column(Boolean, default=False, nullable=False)
    provider_healthy = Column(Boolean, default=False, nullable=False)
    analysis_mode = Column(String, default="ai", nullable=False)
    raw_output_preview = Column(Text, nullable=True)
    error_type = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    context_loaded = Column(Boolean, default=False, nullable=False)
    is_mock_context = Column(Boolean, default=False, nullable=False)
