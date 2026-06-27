from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    ok: Literal[False] = False
    error: ErrorDetail


class SourceMeta(BaseModel):
    is_mock: bool = False
    source: str = "backend"
    status: str = "completed"


class CreatedUpdatedMixin(BaseModel):
    created_at: datetime
    updated_at: datetime


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
