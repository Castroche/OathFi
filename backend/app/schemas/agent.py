from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import SourceMeta


class AgentContextRead(SourceMeta):
    symbol: str
    timeframe: str
    asset: str
    current_price: float | None = None
    price: float | None = None
    last: float | None = None
    change_24h: float | None = None
    volume_24h: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    spread: float | None = None
    imbalance: float | None = None
    orderbook_summary: dict[str, Any] = Field(default_factory=dict)
    trend: str | None = None
    ma: dict[str, Any] = Field(default_factory=dict)
    volatility: float | None = None
    key_levels: dict[str, Any]
    volume: dict[str, Any]
    rsi: float | None = None
    macd: dict[str, Any]
    order_book_summary: dict[str, Any]
    btc_correlation: dict[str, Any]
    funding_rate: dict[str, Any]
    recent_events: list[dict[str, Any]]
    ticker: dict[str, Any] | None = None
    indicators: dict[str, Any] | None = None
    updated_at: datetime


class AgentHypothesisGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str = "ETH/USDT"
    timeframe: str = "15m"
    market_event_id: str | None = None
    provider: str | None = None
    model: str | None = None
    mode: Literal["ai", "rule_based"] = "ai"
    context: dict[str, Any] = Field(default_factory=dict)


class AgentHypothesisPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trigger: str | None = None
    invalidation: str | None = None
    risk: str | None = None
    backtest_rule: str | None = None
    suggested_action: str | None = None
    confidence: int | None = Field(default=None, ge=0, le=100)
    status: str | None = None


class StrategyRuleWriteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy_name: str | None = None
    entry_conditions: list[str] | None = None
    exit_conditions: list[str] | None = None
    risk_controls: list[str] | None = None
    preview: dict[str, Any] | None = None
    status: str = "draft"


class AgentRunRead(SourceMeta):
    id: str
    workflow_id: str
    ai_analysis_id: str | None = None
    symbol: str
    timeframe: str
    current_task: str
    input_sources: list[str]
    output_mode: str
    confidence_calibration: str
    summary: str | None = None
    validity: str | None = None
    overall_confidence: int | None = None
    created_at: datetime
    provider: str | None = None
    model: str | None = None
    provider_configured: bool = False
    provider_healthy: bool = False
    analysis_mode: str = "ai"
    raw_output_preview: str | None = None
    error_type: str | None = None
    error_message: str | None = None
    context_loaded: bool = False
    is_mock_context: bool = False


class AgentHypothesisRead(SourceMeta):
    id: str
    hypothesis_id: str
    workflow_id: str
    market_event_id: str | None = None
    ai_analysis_id: str | None = None
    agent_run_id: str | None = None
    provider: str
    model: str
    is_ai_generated: bool = True
    analysis_mode: str = "ai"
    bias: str | None = None
    suggested_rule: dict[str, Any] | None = None
    symbol: str
    timeframe: str
    title: str
    label: str
    side: str
    type: str
    direction: str
    thesis: str
    trigger: str
    invalidation: str
    risk: str
    backtest_rule: str
    suggested_action: str
    confidence: int
    feasibility: int
    risk_score: int
    entry_condition: str
    invalid_condition: str
    stop_loss: float | None = None
    take_profit: float | None = None
    summary: str
    reasons: list[str]
    warnings: list[str]
    status: str
    latest_backtest_result_id: str | None = None
    latest_risk_check_id: str | None = None
    latest_paper_order_id: str | None = None
    created_at: datetime


class StrategyRuleRead(SourceMeta):
    id: str
    hypothesis_id: str
    workflow_id: str
    symbol: str
    timeframe: str
    strategy_name: str
    entry_conditions: list[str]
    exit_conditions: list[str]
    risk_controls: list[str]
    preview: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class AgentHypothesesGenerateData(BaseModel):
    provider_configured: bool = False
    provider_healthy: bool = False
    provider: str
    model: str
    context_loaded: bool = False
    run_created: bool = False
    hypotheses_count: int = 0
    run_id: str | None = None
    analysis_mode: str = "ai"
    is_ai_generated: bool = True
    error_type: str | None = None
    error_message: str | None = None
    raw_output_preview: str | None = None
    agent_run: AgentRunRead
    context: AgentContextRead
    summary: str
    validity: str
    overall_confidence: int
    hypotheses: list[AgentHypothesisRead]


class AgentContextResponse(BaseModel):
    ok: Literal[True] = True
    data: AgentContextRead


class AgentHypothesesGenerateResponse(BaseModel):
    ok: Literal[True] = True
    data: AgentHypothesesGenerateData


class AgentHypothesisResponse(BaseModel):
    ok: Literal[True] = True
    data: AgentHypothesisRead


class StrategyRuleResponse(BaseModel):
    ok: Literal[True] = True
    data: StrategyRuleRead
