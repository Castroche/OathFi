from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import SourceMeta


class MarketEventRead(SourceMeta):
    id: str
    workflow_id: str | None = None
    symbol: str
    title: str
    summary: str
    event_type: str
    severity: int
    detected_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MarketEventsResponse(BaseModel):
    ok: Literal[True] = True
    data: list[MarketEventRead]


class TickerRead(SourceMeta):
    symbol: str
    price: float
    change_24h: float
    volume_24h: float
    open_24h: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    volume_base_24h: float | None = None
    funding_rate: float | None = None
    funding_rate_label: str | None = None
    latency_ms: int | None = None
    updated_at: datetime


class TickerResponse(BaseModel):
    ok: Literal[True] = True
    data: TickerRead


class SymbolRegistryItem(BaseModel):
    symbol: str
    htxSymbol: str
    base: str
    quote: str
    state: str
    displayName: str
    searchText: str
    pricePrecision: int
    amountPrecision: int
    valuePrecision: int
    minOrderAmount: str = ""
    maxOrderAmount: str = ""


class SymbolRegistryData(BaseModel):
    exchange: str
    symbols: list[SymbolRegistryItem]
    source: str
    updatedAt: int


class SymbolRegistryResponse(BaseModel):
    ok: Literal[True] = True
    data: SymbolRegistryData
    exchange: str
    symbols: list[SymbolRegistryItem]
    source: str
    updatedAt: int


class CachedTickerRead(BaseModel):
    symbol: str
    htxSymbol: str
    last: float
    open: float
    high: float
    low: float
    volume: float
    quoteVolume: float
    change: float
    changePercent: float
    bid: float
    ask: float
    timestamp: int
    updatedAt: str
    source: str


class CachedTickersData(BaseModel):
    exchange: str
    tickers: list[CachedTickerRead]
    source: str
    updatedAt: int


class CachedTickersResponse(BaseModel):
    ok: Literal[True] = True
    data: CachedTickersData
    exchange: str
    tickers: list[CachedTickerRead]
    source: str
    updatedAt: int


class OrderBookLevel(BaseModel):
    price: float
    size: float
    total: float


class OrderBookRead(SourceMeta):
    symbol: str
    bids: list[OrderBookLevel]
    asks: list[OrderBookLevel]
    spread: float
    mid_price: float
    imbalance: float = Field(ge=-1, le=1)
    liquidity_score: float = 0
    latency_ms: int | None = None
    updated_at: datetime


class OrderBookResponse(BaseModel):
    ok: Literal[True] = True
    data: OrderBookRead


class KlineRead(SourceMeta):
    symbol: str
    timeframe: str
    klines: list[dict]
    latency_ms: int | None = None
    updated_at: datetime


class KlineResponse(BaseModel):
    ok: Literal[True] = True
    data: KlineRead


class TradesRead(SourceMeta):
    symbol: str
    trades: list[dict]
    latency_ms: int | None = None
    updated_at: datetime


class TradesResponse(BaseModel):
    ok: Literal[True] = True
    data: TradesRead


class IndicatorsRead(SourceMeta):
    symbol: str
    timeframe: str
    ma20: float | None = None
    ma50: float | None = None
    ma200: float | None = None
    rsi14: float | None = None
    volume: float | None = None
    volume_average_20: float | None = None
    updated_at: datetime


class IndicatorsResponse(BaseModel):
    ok: Literal[True] = True
    data: IndicatorsRead


class MarketSourceStatusResponse(BaseModel):
    ok: Literal[True] = True
    data: dict
