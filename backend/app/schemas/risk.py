from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class RiskCheckRequest(BaseModel):
    hypothesis_id: str
    backtest_id: str | None = None
    account_equity: float | None = None
    risk_per_trade: float | None = None
    position_size: float | None = None
    entry_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None


class RiskItem(BaseModel):
    name: str
    status: str
    message: str
    threshold: str | None = None
    actual: str | None = None


class RiskRuleDefinition(BaseModel):
    name: str
    label: str
    threshold: str
    source: str


class RiskCheckRead(SourceMeta):
    id: str
    workflow_id: str
    hypothesis_id: str
    backtest_id: str | None = None
    decision: str
    status: str
    risk_level: str
    risk_score: float
    account_equity: float
    risk_per_trade: float
    position_size: float
    entry_price: float
    stop_loss: float
    take_profit: float | None = None
    max_loss: float
    reward_risk: float
    leverage: float
    execution_mode: str
    live_trading_enabled: bool
    checks: list[RiskItem]
    rule_results: list[RiskItem]
    blocks: list[str]
    warnings: list[str]
    block_reasons: list[str]
    market_data_status: str
    created_at: datetime


class RiskCheckResponse(BaseModel):
    ok: Literal[True] = True
    data: RiskCheckRead


class RiskCheckListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[RiskCheckRead]


class RiskRulesResponse(BaseModel):
    ok: Literal[True] = True
    data: list[RiskRuleDefinition]
