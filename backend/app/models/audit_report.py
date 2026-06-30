from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text

from app.db.base import Base, TimestampMixin


class AuditReport(Base, TimestampMixin):
    __tablename__ = "audit_reports"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    event_type = Column(String, default="unknown", nullable=False)
    hypothesis_id = Column(String, nullable=False, index=True)
    market_event_id = Column(String, nullable=True, index=True)
    backtest_id = Column(String, nullable=True)
    risk_check_id = Column(String, nullable=True)
    paper_order_id = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    decision = Column(String, default="INCOMPLETE", nullable=False)
    risk_level = Column(String, default="unknown", nullable=False)
    result = Column(String, default="pending", nullable=False)
    outcome = Column(Text, default="", nullable=False)
    audit_hash = Column(String, default="", nullable=False)
    report_json = Column(JSON, default=dict, nullable=False)
    market_context_json = Column(JSON, nullable=False)
    hypothesis_json = Column(JSON, nullable=False)
    backtest_json = Column(JSON, nullable=False)
    risk_json = Column(JSON, nullable=False)
    paper_execution_json = Column(JSON, nullable=False)
    final_decision = Column(String, nullable=False)
    lessons_json = Column(JSON, nullable=False)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True)
    audit_report_id = Column(String, nullable=False, index=True)
    workflow_id = Column(String, nullable=False, index=True)
    step_index = Column(Integer, nullable=False)
    step_key = Column(String, nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    details_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, nullable=False)


class AuditEvidence(Base):
    __tablename__ = "audit_evidence"

    id = Column(String, primary_key=True)
    audit_report_id = Column(String, nullable=False, index=True)
    workflow_id = Column(String, nullable=False, index=True)
    evidence_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    payload_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, nullable=False)
