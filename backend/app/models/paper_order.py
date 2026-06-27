from sqlalchemy import Boolean, Column, Float, String, Text

from app.db.base import Base, TimestampMixin


class PaperOrder(Base, TimestampMixin):
    __tablename__ = "paper_orders"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    hypothesis_id = Column(String, nullable=False, index=True)
    backtest_id = Column(String, nullable=True)
    risk_check_id = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)
    order_type = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
    is_real_trade = Column(Boolean, default=False, nullable=False)
    execution_mode = Column(String, default="paper", nullable=False)
    error_message = Column(Text, nullable=True)
