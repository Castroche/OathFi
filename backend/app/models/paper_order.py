from sqlalchemy import Boolean, Column, DateTime, Float, JSON, String, Text

from app.db.base import Base, TimestampMixin


class PaperAccount(Base, TimestampMixin):
    __tablename__ = "paper_accounts"

    id = Column(String, primary_key=True)
    equity = Column(Float, default=10000.0, nullable=False)
    available_balance = Column(Float, default=10000.0, nullable=False)
    used_margin = Column(Float, default=0.0, nullable=False)
    unrealized_pnl = Column(Float, default=0.0, nullable=False)
    realized_pnl = Column(Float, default=0.0, nullable=False)
    daily_loss = Column(Float, default=0.0, nullable=False)
    max_daily_loss = Column(Float, default=500.0, nullable=False)
    risk_utilization = Column(Float, default=0.0, nullable=False)


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
    position_size = Column(Float, nullable=True)
    risk_amount = Column(Float, nullable=True)
    mode = Column(String, default="paper", nullable=False)
    risk_status = Column(String, nullable=True)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
    is_real_trade = Column(Boolean, default=False, nullable=False)
    execution_mode = Column(String, default="paper", nullable=False)
    error_message = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    filled_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)


class PaperFill(Base):
    __tablename__ = "paper_fills"

    id = Column(String, primary_key=True)
    paper_order_id = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    fill_price = Column(Float, nullable=False)
    fee = Column(Float, default=0.0, nullable=False)
    slippage = Column(Float, default=0.0, nullable=False)
    liquidity_type = Column(String, default="simulated", nullable=False)
    created_at = Column(DateTime, nullable=False)


class PaperPosition(Base, TimestampMixin):
    __tablename__ = "paper_positions"

    id = Column(String, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    mark_price = Column(Float, nullable=False)
    unrealized_pnl = Column(Float, default=0.0, nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    risk_check_id = Column(String, nullable=False, index=True)
    hypothesis_id = Column(String, nullable=False, index=True)
    status = Column(String, default="open", nullable=False)


class PaperExecutionLog(Base):
    __tablename__ = "paper_execution_logs"

    id = Column(String, primary_key=True)
    paper_order_id = Column(String, nullable=True, index=True)
    hypothesis_id = Column(String, nullable=True, index=True)
    risk_check_id = Column(String, nullable=True, index=True)
    event_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, nullable=False)
