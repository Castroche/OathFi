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
    strategy_id: str | None = None
    symbol: str
    timeframe: str
    status: str
    win_rate: float
    profit_factor: float
    expectancy: float
    max_drawdown: float
    sample_size: int
    trade_count: int
    avg_rr: float
    sharpe: float
    sample_quality: str
    equity_curve: list[dict]
    drawdown_curve: list[dict]
    pnl_distribution: list[dict]
    trades: list[dict]
    methodology: str
    data_source: str
    sample_period: str
    fees: float
    slippage: float
    initial_capital: float
    final_equity: float
    net_pnl: float
    max_consecutive_losses: int
    exposure_time: float
    data_window: dict
    strategy_rule_snapshot: dict
    verdict: dict
    report: dict
    created_at: datetime


class BacktestResponse(BaseModel):
    ok: Literal[True] = True
    data: BacktestRead


class BacktestListResponse(BaseModel):
    ok: Literal[True] = True
    data: list[BacktestRead]
