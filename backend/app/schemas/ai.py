from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import SourceMeta


class AIAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str = "ETH/USDT"
    task: str = "market_analysis"
    provider: str | None = None
    model: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class AIAnalysisRead(SourceMeta):
    id: str
    workflow_id: str | None = None
    provider: str
    model: str
    task: str
    summary: str
    signals: list[str]
    risks: list[str]
    recommendation: str
    confidence: int
    ai_analysis_id: str | None = None
    created_at: datetime


class AIAnalysisResponse(BaseModel):
    ok: Literal[True] = True
    data: AIAnalysisRead


class AIProviderTestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: str
    model: str | None = None


class AIProviderTestRead(BaseModel):
    ok: bool
    provider: str
    model: str
    latency_ms: int
    error_type: str | None = None
    error_message: str | None = None


class AIProviderModelsRead(BaseModel):
    provider: str
    configured: bool
    models: list[str]
    default_model: str
