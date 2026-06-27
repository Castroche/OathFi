from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import SourceMeta


class HypothesisGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str = "ETH/USDT"
    timeframe: str = "15m"
    market_event_id: str | None = None
    provider: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class HypothesisRead(SourceMeta):
    id: str
    hypothesis_id: str
    workflow_id: str
    market_event_id: str | None = None
    ai_analysis_id: str | None = None
    provider: str
    model: str
    title: str
    symbol: str
    side: str
    timeframe: str
    direction: str
    thesis: str
    entry_condition: str
    invalid_condition: str
    stop_loss: float | None = None
    take_profit: float | None = None
    confidence: int
    feasibility: int
    risk: int
    long_confidence: int | None = None
    short_confidence: int | None = None
    summary: str
    reasons: list[str]
    warnings: list[str]
    latest_backtest_result_id: str | None = None
    latest_risk_check_id: str | None = None
    latest_paper_order_id: str | None = None
    created_at: datetime


class HypothesisResponse(BaseModel):
    ok: Literal[True] = True
    data: HypothesisRead
