from sqlalchemy import Boolean, Column, Integer, String, Text, UniqueConstraint

from app.db.base import Base, TimestampMixin


class AITranslationCache(Base, TimestampMixin):
    __tablename__ = "ai_translation_cache"
    __table_args__ = (UniqueConstraint("text_hash", "target_language", name="uq_ai_translation_text_target"),)

    id = Column(String, primary_key=True)
    text_hash = Column(String, nullable=False, index=True)
    source_language = Column(String, nullable=False)
    target_language = Column(String, nullable=False)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    status = Column(String, nullable=False, default="completed")
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    is_mock = Column(Boolean, nullable=False, default=False)
