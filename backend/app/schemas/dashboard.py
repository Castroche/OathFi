from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.market import MarketEventRead


class DashboardMarketPulse(BaseModel):
    symbols: list[str]
    status: str
    latency_ms: int | None = None
    source: str = "backend"
    active_events: int = 0


class DashboardAgentStatus(BaseModel):
    running: bool
    current_task: str | None = None
    model_provider: str | None = None
    last_analysis_at: datetime | None = None
    status: str = "disconnected"


class DashboardRiskSummary(BaseModel):
    global_risk_level: str
    volatility_score: int
    liquidity_score: int
    execution_mode: Literal["paper", "live_disabled"] = "paper"
    live_trading_enabled: bool = False
    latest_decision: str | None = None
    last_checked_at: datetime | None = None


class DashboardSummary(BaseModel):
    market_pulse: DashboardMarketPulse
    agent_status: DashboardAgentStatus
    risk_summary: DashboardRiskSummary


class DashboardSummaryResponse(BaseModel):
    ok: Literal[True] = True
    data: DashboardSummary


class DashboardOpportunity(BaseModel):
    symbol: str
    setup: str
    setup_quality: int
    time_horizon: str
    confidence: str
    direction: str
    risk_reward: float | None = None
    hypothesis_id: str | None = None
    market_event_id: str | None = None
    source: str = "backend"
    status: str = "ready"
    is_mock: bool = False
    created_at: datetime | None = None


class DashboardOpportunityResponse(BaseModel):
    ok: Literal[True] = True
    data: DashboardOpportunity | None = None


class DashboardDecision(BaseModel):
    id: str
    workflow_id: str | None = None
    action_type: str
    entity_type: str
    entity_id: str | None = None
    message: str
    source: str
    status: str
    is_mock: bool
    created_at: datetime


class DashboardRecentDecisionsResponse(BaseModel):
    ok: Literal[True] = True
    data: list[DashboardDecision]


class DashboardMarketEventsResponse(BaseModel):
    ok: Literal[True] = True
    data: list[MarketEventRead]
