from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CredentialStatus(BaseModel):
    provider: str
    configured: bool
    masked_key: str | None = None
    base_url: str | None = None
    model: str | None = None
    is_active: bool = True
    updated_at: datetime | None = None


class CredentialStatusList(BaseModel):
    credentials: list[CredentialStatus]


class CredentialUpdate(BaseModel):
    api_key: str | None = Field(default=None, max_length=4096)
    secret: str | None = Field(default=None, max_length=4096)
    extra_json: dict[str, str | int | float | bool | None] | None = None
    base_url: str | None = Field(default=None, max_length=1024)
    model: str | None = Field(default=None, max_length=256)
    is_active: bool = True


class CredentialStatusResponse(BaseModel):
    ok: Literal[True] = True
    data: CredentialStatus


class CredentialStatusListResponse(BaseModel):
    ok: Literal[True] = True
    data: CredentialStatusList
