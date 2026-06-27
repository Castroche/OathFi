from sqlalchemy import Boolean, Column, JSON, String

from app.db.base import Base, TimestampMixin


class StrategyRule(Base, TimestampMixin):
    __tablename__ = "strategy_rules"

    id = Column(String, primary_key=True)
    hypothesis_id = Column(String, nullable=False, index=True)
    workflow_id = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    timeframe = Column(String, nullable=False)
    strategy_name = Column(String, nullable=False)
    entry_conditions_json = Column(JSON, nullable=False)
    exit_conditions_json = Column(JSON, nullable=False)
    risk_controls_json = Column(JSON, nullable=False)
    preview_json = Column(JSON, nullable=False)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="draft", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
