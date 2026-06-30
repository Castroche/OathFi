from sqlalchemy import Boolean, Column, Float, Integer, JSON, String

from app.db.base import Base, TimestampMixin


class UserSettings(Base, TimestampMixin):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True)
    default_symbol = Column(String, nullable=False)
    default_timeframe = Column(String, nullable=False)
    demo_mode = Column(Boolean, nullable=False)
    default_ai_provider = Column(String, nullable=False)
    paper_trading_enabled = Column(Boolean, nullable=False)
    real_trading_enabled = Column(Boolean, nullable=False)
    language = Column(String, nullable=False)
    settings_json = Column(JSON, nullable=False)
    primary_data_source = Column(String, nullable=False, default="HTX")
    connection_type = Column(String, nullable=False, default="Hybrid")
    fallback_method = Column(String, nullable=False, default="REST fallback")
    latency_monitor_enabled = Column(Boolean, nullable=False, default=True)
    latency_warning_ms = Column(Integer, nullable=False, default=800)
    latency_critical_ms = Column(Integer, nullable=False, default=2000)
    auto_reconnect_enabled = Column(Boolean, nullable=False, default=True)
    model_provider = Column(String, nullable=False, default="deepseek")
    model_name = Column(String, nullable=False, default="deepseek-v4-flash")
    output_mode = Column(String, nullable=False, default="Structured")
    confidence_calibration = Column(String, nullable=False, default="Balanced")
    structured_hypothesis_enabled = Column(Boolean, nullable=False, default=True)
    default_confidence_bands = Column(JSON, nullable=False, default=dict)
    max_risk_per_trade = Column(Float, nullable=False, default=0.01)
    max_daily_loss = Column(Float, nullable=False, default=0.03)
    max_consecutive_losses = Column(Integer, nullable=False, default=3)
    position_size_mode = Column(String, nullable=False, default="Risk Based")
    stop_loss_enforcement = Column(Boolean, nullable=False, default=True)
    live_trading_enabled = Column(Boolean, nullable=False, default=False)
    demo_mode_enabled = Column(Boolean, nullable=False, default=True)
    use_sample_account = Column(Boolean, nullable=False, default=True)
    paper_execution_only = Column(Boolean, nullable=False, default=True)
    guided_demo_flow = Column(Boolean, nullable=False, default=True)
    demo_scenario = Column(String, nullable=False, default="pass")
