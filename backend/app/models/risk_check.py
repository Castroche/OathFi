from sqlalchemy import Boolean, Column, Float, JSON, String

from app.db.base import Base, TimestampMixin


class RiskCheck(Base, TimestampMixin):
    __tablename__ = "risk_checks"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    hypothesis_id = Column(String, nullable=False, index=True)
    backtest_id = Column(String, nullable=True)
    decision = Column(String, nullable=False)
    account_equity = Column(Float, nullable=False)
    risk_per_trade = Column(Float, nullable=False)
    position_size = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit = Column(Float, nullable=True)
    checks_json = Column(JSON, nullable=False)
    warnings_json = Column(JSON, nullable=False)
    block_reasons_json = Column(JSON, nullable=False)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
