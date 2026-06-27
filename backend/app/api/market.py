from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.providers.market import MarketProviderError
from app.db.session import get_db
from app.schemas.market import (
    IndicatorsResponse,
    MarketEventRead,
    MarketEventsResponse,
    KlineResponse,
    OrderBookResponse,
    CachedTickersResponse,
    MarketSourceStatusResponse,
    SymbolRegistryResponse,
    TickerResponse,
    TradesResponse,
)
from app.services.htx_symbol_service import HtxSymbolService
from app.services.market_data_service import MarketDataService

router = APIRouter(prefix="/market", tags=["market"])
service = MarketDataService()
symbol_service = HtxSymbolService()


def market_stream_required() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "ok": False,
            "error": {
                "code": "MARKET_STREAM_REQUIRED",
                "message": "REST market snapshots are disabled. Connect to /ws/market for live HTX data.",
            },
        },
    )


def market_source_error(exc: MarketProviderError) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "ok": False,
            "error": {
                "code": "MARKET_SOURCE_UNAVAILABLE",
                "message": str(exc),
                "details": {"source": "htx"},
            },
        },
    )


@router.get("/events", response_model=MarketEventsResponse)
def get_market_events(
    symbol: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    source: str | None = None,
    db: Session = Depends(get_db),
) -> MarketEventsResponse:
    events = service.list_events(db, symbol=symbol, limit=limit, source=source)
    return MarketEventsResponse(
        data=[MarketEventRead.model_validate(event, from_attributes=True) for event in events]
    )


@router.get("/ticker", response_model=TickerResponse)
def get_ticker(
    symbol: str = Query(default="ETH/USDT"),
    persist: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> TickerResponse:
    try:
        return TickerResponse(data=service.get_ticker(symbol, db=db if persist else None, persist=persist))
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.get("/symbols", response_model=SymbolRegistryResponse)
def get_symbols(quote: str | None = Query(default=None)) -> SymbolRegistryResponse:
    data = symbol_service.get_symbols(quote=quote)
    return SymbolRegistryResponse(data=data, **data)


@router.get("/tickers", response_model=CachedTickersResponse)
def get_tickers(symbols: str | None = Query(default=None)) -> CachedTickersResponse:
    try:
        data = symbol_service.get_tickers(symbols=symbols)
        return CachedTickersResponse(data=data, **data)
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.get("/orderbook", response_model=OrderBookResponse)
def get_orderbook(
    symbol: str = Query(default="ETH/USDT"),
    depth: int = Query(default=20, ge=1, le=50),
    persist: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> OrderBookResponse:
    try:
        return OrderBookResponse(data=service.get_orderbook(symbol, depth, db=db if persist else None, persist=persist))
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.get("/klines", response_model=KlineResponse)
def get_klines(
    symbol: str = Query(default="ETH/USDT"),
    timeframe: str = Query(default="1m"),
    limit: int = Query(default=200, ge=1, le=1000),
    persist: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> KlineResponse:
    try:
        return KlineResponse(data=service.get_klines(symbol, timeframe, limit, db=db if persist else None, persist=persist))
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.get("/kline", response_model=KlineResponse)
def get_kline_compat(
    symbol: str = Query(default="ETH/USDT"),
    timeframe: str = Query(default="1m"),
    limit: int = Query(default=200, ge=1, le=1000),
    persist: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> KlineResponse:
    return get_klines(symbol=symbol, timeframe=timeframe, limit=limit, persist=persist, db=db)


@router.get("/trades", response_model=TradesResponse)
def get_trades(
    symbol: str = Query(default="ETH/USDT"),
    limit: int = Query(default=60, ge=1, le=200),
    persist: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> TradesResponse:
    try:
        return TradesResponse(data=service.get_trades(symbol, limit, db=db if persist else None, persist=persist))
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.get("/indicators", response_model=IndicatorsResponse)
def get_indicators(
    symbol: str = Query(default="ETH/USDT"),
    timeframe: str = Query(default="1m"),
    limit: int = Query(default=300, ge=20, le=1000),
    persist: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> IndicatorsResponse:
    try:
        return IndicatorsResponse(data=service.get_indicators(symbol, timeframe, limit, db=db if persist else None, persist=persist))
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.post("/events/detect", response_model=MarketEventsResponse)
def detect_market_events(
    symbol: str = Query(default="ETH/USDT"),
    timeframe: str = Query(default="1m"),
    db: Session = Depends(get_db),
) -> MarketEventsResponse:
    try:
        events = service.detect_events(db, symbol, timeframe)
        return MarketEventsResponse(data=[MarketEventRead.model_validate(event, from_attributes=True) for event in events])
    except MarketProviderError as exc:
        raise market_source_error(exc) from exc


@router.get("/status", response_model=MarketSourceStatusResponse)
def get_market_status() -> MarketSourceStatusResponse:
    return MarketSourceStatusResponse(data=service.get_source_status())


@router.get("/source-status", response_model=MarketSourceStatusResponse)
def get_source_status() -> MarketSourceStatusResponse:
    return MarketSourceStatusResponse(data=service.get_source_status())
