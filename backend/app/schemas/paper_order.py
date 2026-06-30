from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class PaperOrderCreateRequest(BaseModel):
    hypothesis_id: str
    backtest_id: str | None = None
    risk_check_id: str | None = None
    symbol: str = "ETH/USDT"
    side: str = "buy"
    order_type: str = "limit"
    price: float
    quantity: float
    stop_loss: float | None = None
    take_profit: float | None = None
    mode: str = "paper"


class PaperOrderRead(SourceMeta):
    id: str
    workflow_id: str
    hypothesis_id: str
    backtest_id: str | None = None
    risk_check_id: str
    status: str
    symbol: str
    side: str
    order_type: str
    price: float
    quantity: float
    stop_loss: float | None = None
    take_profit: float | None = None
    position_size: float | None = None
    risk_amount: float | None = None
    mode: str
    risk_status: str | None = None
    is_real_trade: bool
    execution_mode: str
    risk_check: dict | None = None
    hypothesis: dict | None = None
    backtest_result: dict | None = None
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None = None
    filled_at: datetime | None = None
    cancelled_at: datetime | None = None


class PaperAccountRead(BaseModel):
    id: str
    equity: float
    available_balance: float
    used_margin: float
    unrealized_pnl: float
    realized_pnl: float
    daily_loss: float
    max_daily_loss: float
    risk_utilization: float


class PaperPositionRead(BaseModel):
    id: str
    symbol: str
    side: str
    quantity: float
    entry_price: float
    mark_price: float
    unrealized_pnl: float
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_check_id: str
    hypothesis_id: str
    status: str


class PaperExecutionLogRead(BaseModel):
    id: str
    paper_order_id: str | None = None
    hypothesis_id: str | None = None
    risk_check_id: str | None = None
    event_type: str
    status: str
    message: str
    metadata_json: dict[str, Any]
    created_at: datetime


class PaperOrderResponse(BaseModel):
    ok: Literal[True] = True
    data: PaperOrderRead


class PaperOrderListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[PaperOrderRead]


class PaperAccountResponse(BaseModel):
    ok: Literal[True] = True
    data: PaperAccountRead


class PaperPositionListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[PaperPositionRead]


class PaperExecutionLogListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[PaperExecutionLogRead]
