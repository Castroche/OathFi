from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class RiskCheckRequest(BaseModel):
    hypothesis_id: str
    backtest_id: str | None = None
    account_equity: float = 10000
    risk_per_trade: float = 0.011
    position_size: float = 0.65
    entry_price: float = 3446
    stop_loss: float = 3392
    take_profit: float | None = 3544


class RiskItem(BaseModel):
    name: str
    status: str
    message: str


class RiskCheckRead(SourceMeta):
    id: str
    workflow_id: str
    hypothesis_id: str
    backtest_id: str | None = None
    decision: str
    checks: list[RiskItem]
    warnings: list[str]
    block_reasons: list[str]
    created_at: datetime


class RiskCheckResponse(BaseModel):
    ok: Literal[True] = True
    data: RiskCheckRead


class RiskCheckListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[RiskCheckRead]
