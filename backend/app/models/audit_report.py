from sqlalchemy import Boolean, Column, JSON, String, Text

from app.db.base import Base, TimestampMixin


class AuditReport(Base, TimestampMixin):
    __tablename__ = "audit_reports"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    hypothesis_id = Column(String, nullable=False, index=True)
    backtest_id = Column(String, nullable=True)
    risk_check_id = Column(String, nullable=True)
    paper_order_id = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
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
