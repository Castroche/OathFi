from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class PaperOrderCreateRequest(BaseModel):
    hypothesis_id: str
    backtest_id: str | None = None
    risk_check_id: str
    symbol: str = "ETH/USDT"
    side: str = "buy"
    order_type: str = "limit"
    price: float
    quantity: float
    stop_loss: float | None = None
    take_profit: float | None = None


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
    is_real_trade: bool
    execution_mode: str
    risk_check: dict | None = None
    created_at: datetime


class PaperOrderResponse(BaseModel):
    ok: Literal[True] = True
    data: PaperOrderRead


class PaperOrderListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[PaperOrderRead]
