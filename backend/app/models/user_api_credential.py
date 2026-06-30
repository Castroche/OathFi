from sqlalchemy import Boolean, Column, JSON, String

from app.db.base import Base, TimestampMixin


class UserApiCredential(Base, TimestampMixin):
    __tablename__ = "user_api_credentials"

    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False, unique=True, index=True)
    encrypted_api_key = Column(String, nullable=True)
    encrypted_secret = Column(String, nullable=True)
    encrypted_extra_json = Column(String, nullable=True)
    base_url = Column(String, nullable=True)
    model = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    metadata_json = Column(JSON, nullable=False, default=dict)
