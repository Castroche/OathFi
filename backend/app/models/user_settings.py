from sqlalchemy import Boolean, Column, JSON, String

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
