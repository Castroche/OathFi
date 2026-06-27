from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceMeta


class BacktestCreateRequest(BaseModel):
    hypothesis_id: str
    symbol: str = "ETH/USDT"
    timeframe: str = "15m"
    start_time: datetime
    end_time: datetime
    initial_capital: float = 10000


class BacktestRead(SourceMeta):
    id: str
    workflow_id: str
    hypothesis_id: str
    status: str
    win_rate: float
    profit_factor: float
    expectancy: float
    max_drawdown: float
    trade_count: int
    avg_rr: float
    sample_quality: str
    equity_curve: list[dict]
    trades: list[dict]
    methodology: str
    data_source: str
    sample_period: str
    created_at: datetime


class BacktestResponse(BaseModel):
    ok: Literal[True] = True
    data: BacktestRead


class BacktestListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[BacktestRead]
