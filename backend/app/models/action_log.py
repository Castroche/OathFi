from sqlalchemy import Boolean, Column, DateTime, JSON, String, Text

from app.db.base import Base, now_utc


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=True, index=True)
    action_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    payload_json = Column(JSON, nullable=True)
    source = Column(String, default="backend", nullable=False)
    status = Column(String, default="disconnected", nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=now_utc, nullable=False)
