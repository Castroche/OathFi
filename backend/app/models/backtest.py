from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String, Text

from app.db.base import Base, TimestampMixin


class BacktestJob(Base, TimestampMixin):
    __tablename__ = "backtest_jobs"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    hypothesis_id = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    initial_capital = Column(Float, nullable=False)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)


class BacktestResult(Base, TimestampMixin):
    __tablename__ = "backtest_results"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=False, index=True)
    backtest_job_id = Column(String, nullable=False, index=True)
    hypothesis_id = Column(String, nullable=False, index=True)
    win_rate = Column(Float, nullable=False)
    profit_factor = Column(Float, nullable=False)
    expectancy = Column(Float, nullable=False)
    max_drawdown = Column(Float, nullable=False)
    trade_count = Column(Integer, nullable=False)
    avg_rr = Column(Float, nullable=False)
    sample_quality = Column(String, nullable=False)
    equity_curve_json = Column(JSON, nullable=False)
    trades_json = Column(JSON, nullable=False)
    metrics_json = Column(JSON, nullable=False)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
