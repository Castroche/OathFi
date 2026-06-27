from __future__ import annotations

import asyncio
import gzip
import json
import logging
from typing import Any

import websockets
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder

from app.providers.market.base import cumulative_levels, htx_symbol, normalize_symbol, orderbook_metrics, utc_now
from app.providers.market import MarketProviderError
from app.services.market_data_service import MarketDataService

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

HTX_WS_URLS = ("wss://api.huobi.pro/ws", "wss://api-aws.huobi.pro/ws")
HTX_PERIOD_BY_TIMEFRAME = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "1h": "60min",
    "4h": "4hour",
    "1d": "1day",
}
DEFAULT_STREAMS = {"ticker", "kline", "depth", "trade"}
STREAM_ALIASES = {
    "ticker": "ticker",
    "kline": "kline",
    "klines": "kline",
    "depth": "depth",
    "orderbook": "depth",
    "trade": "trade",
    "trades": "trade",
}


def parse_streams(value: str | None) -> set[str]:
    if not value:
        return set(DEFAULT_STREAMS)
    requested = {
        STREAM_ALIASES[item.strip().lower()]
        for item in value.split(",")
        if item.strip().lower() in STREAM_ALIASES
    }
    return requested or set(DEFAULT_STREAMS)


def decode_htx_message(payload: bytes | str) -> dict[str, Any]:
    if isinstance(payload, str):
        return json.loads(payload)
    try:
        return json.loads(gzip.decompress(payload).decode("utf-8"))
    except OSError:
        return json.loads(payload.decode("utf-8"))


def ticker_payload(symbol: str, tick: dict[str, Any], message_ts: int | None) -> dict[str, Any]:
    open_price = float(tick.get("open") or tick.get("close") or 0)
    price = float(tick.get("close") or open_price)
    change_24h = ((price - open_price) / open_price * 100) if open_price else 0.0
    return {
        "symbol": normalize_symbol(symbol),
        "price": price,
        "change_24h": round(change_24h, 6),
        "volume_24h": float(tick.get("vol") or 0),
        "source": "live_ws_htx",
        "status": "live",
        "updated_at": utc_now() if message_ts is None else message_ts,
        "is_mock": False,
    }


def bbo_ticker_payload(symbol: str, tick: dict[str, Any], message_ts: int | None) -> dict[str, Any]:
    bid = float(tick.get("bid") or 0)
    ask = float(tick.get("ask") or 0)
    price = (bid + ask) / 2 if bid and ask else bid or ask
    return {
        "symbol": normalize_symbol(symbol),
        "price": price,
        "change_24h": 0,
        "volume_24h": 0,
        "source": "live_ws_htx",
        "status": "live",
        "updated_at": utc_now() if message_ts is None else message_ts,
        "is_mock": False,
    }


def kline_payload(symbol: str, timeframe: str, tick: dict[str, Any], message_ts: int | None) -> dict[str, Any]:
    timestamp = int(tick.get("id") or ((message_ts or utc_now().timestamp() * 1000) / 1000)) * 1000
    return {
        "symbol": normalize_symbol(symbol),
        "timeframe": timeframe,
        "kline": {
            "timestamp": timestamp,
            "open": float(tick.get("open") or 0),
            "high": float(tick.get("high") or 0),
            "low": float(tick.get("low") or 0),
            "close": float(tick.get("close") or 0),
            "volume": float(tick.get("amount") or 0),
            "turnover": float(tick.get("vol") or 0),
        },
        "source": "live_ws_htx",
        "status": "live",
        "updated_at": utc_now() if message_ts is None else message_ts,
        "is_mock": False,
    }


def orderbook_payload(symbol: str, tick: dict[str, Any], depth: int, message_ts: int | None) -> dict[str, Any]:
    bids = cumulative_levels([(float(price), float(size)) for price, size in tick.get("bids", [])], depth)
    asks = cumulative_levels([(float(price), float(size)) for price, size in tick.get("asks", [])], depth)
    return {
        "symbol": normalize_symbol(symbol),
        "bids": bids,
        "asks": asks,
        **orderbook_metrics(bids, asks),
        "source": "live_ws_htx",
        "status": "live",
        "updated_at": utc_now() if message_ts is None else message_ts,
        "is_mock": False,
    }


def trades_payload(symbol: str, tick: dict[str, Any], message_ts: int | None) -> dict[str, Any]:
    rows = []
    for item in tick.get("data", []) or []:
        if not isinstance(item, dict):
            continue
        trade_ts = int(item.get("ts") or message_ts or utc_now().timestamp() * 1000)
        trade_id = str(item.get("id") or item.get("trade-id") or f"{trade_ts}-{item.get('price')}-{item.get('amount')}")
        rows.append(
            {
                "id": trade_id,
                "symbol": normalize_symbol(symbol),
                "timestamp": trade_ts,
                "price": float(item.get("price") or 0),
                "amount": float(item.get("amount") or 0),
                "side": "buy" if item.get("direction") == "buy" else "sell",
            }
        )
    return {
        "symbol": normalize_symbol(symbol),
        "trades": rows,
        "source": "live_ws_htx",
        "status": "live",
        "updated_at": utc_now() if message_ts is None else message_ts,
        "is_mock": False,
    }


def ms_to_iso(value: int | None) -> str:
    if value is None:
        return utc_now().isoformat()
    from datetime import datetime, timezone

    return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()


async def connect_htx(symbol: str):
    last_error: Exception | None = None
    for url in HTX_WS_URLS:
        try:
            return await websockets.connect(url, ping_interval=None, open_timeout=5, close_timeout=2)
        except Exception as exc:
            last_error = exc
    raise RuntimeError(str(last_error) if last_error else "HTX WebSocket unavailable")


async def send_disconnected_status(websocket: WebSocket, normalized: str, reason: str) -> None:
    await websocket.send_json(
        jsonable_encoder(
            {
                "type": "source_status",
                "symbol": normalized,
                "data": {
                    "providers": [
                        {
                            "source": "live_ws_htx",
                            "status": "disconnected",
                            "updated_at": utc_now(),
                            "is_mock": False,
                            "supports_stream": True,
                        }
                    ],
                    "errors": {"htx_ws": reason},
                    "rest_snapshots": "disabled",
                    "updated_at": utc_now(),
                },
            }
        )
    )


async def stream_rest_fallback(websocket: WebSocket, normalized: str, timeframe: str, depth: int, streams: set[str], reason: str) -> None:
    service = MarketDataService()
    await websocket.send_json(
        jsonable_encoder(
            {
                "type": "source_status",
                "symbol": normalized,
                "data": {
                    "providers": [
                        {
                            "source": "live_ws_htx",
                            "status": "disconnected",
                            "updated_at": utc_now(),
                            "is_mock": False,
                            "supports_stream": True,
                        },
                        {
                            "source": "htx_rest_fallback",
                            "status": "degraded",
                            "updated_at": utc_now(),
                            "is_mock": False,
                            "supports_stream": False,
                        },
                    ],
                    "errors": {"htx_ws": reason},
                    "rest_snapshots": "enabled",
                    "updated_at": utc_now(),
                },
            }
        )
    )
    while True:
        try:
            for message in service.websocket_snapshot(normalized, timeframe=timeframe, depth=depth, streams=streams):
                await websocket.send_json(jsonable_encoder(message))
        except MarketProviderError as exc:
            await websocket.send_json(
                jsonable_encoder(
                    {
                        "type": "source_status",
                        "symbol": normalized,
                        "data": {
                            "providers": [],
                            "errors": {"htx_rest_fallback": str(exc), "htx_ws": reason},
                            "rest_snapshots": "enabled",
                            "updated_at": utc_now(),
                        },
                    }
                )
            )
        await asyncio.sleep(10)


@router.websocket("/ws/market")
async def market_socket(
    websocket: WebSocket,
    symbol: str = Query(default="ETH/USDT"),
    timeframe: str = Query(default="1m"),
    depth: int = Query(default=20, ge=1, le=50),
    streams: str | None = Query(default=None),
) -> None:
    await websocket.accept()
    normalized = normalize_symbol(symbol)
    compact = htx_symbol(normalized)
    normalized_timeframe = timeframe if timeframe in HTX_PERIOD_BY_TIMEFRAME else "1m"
    period = HTX_PERIOD_BY_TIMEFRAME[normalized_timeframe]
    requested_streams = parse_streams(streams)
    all_topics = {
        "ticker": f"market.{compact}.detail",
        "tickerFallback": f"market.{compact}.bbo",
        "kline": f"market.{compact}.kline.{period}",
        "depth": f"market.{compact}.depth.step0",
        "trade": f"market.{compact}.trade.detail",
    }
    topics = {
        stream: topic
        for stream, topic in all_topics.items()
        if stream in requested_streams
    }
    active_topics = set(topics.values())

    try:
        htx = await connect_htx(normalized)
    except Exception as exc:
        logger.warning("HTX WebSocket unavailable for %s: %s", normalized, exc)
        try:
            await stream_rest_fallback(websocket, normalized, normalized_timeframe, depth, requested_streams, str(exc))
        except WebSocketDisconnect:
            return
        return

    try:
        async with htx:
            logger.info(
                "HTX active subscriptions symbol=%s timeframe=%s topics=%s",
                normalized,
                normalized_timeframe,
                sorted(active_topics),
            )
            for topic in active_topics:
                await htx.send(json.dumps({"sub": topic, "id": topic}))

            await websocket.send_json(
                jsonable_encoder(
                    {
                        "type": "source_status",
                        "symbol": normalized,
                        "data": {
                            "providers": [
                                {
                                    "source": "live_ws_htx",
                                    "status": "live",
                                    "updated_at": utc_now(),
                                    "is_mock": False,
                                    "supports_stream": True,
                                }
                            ],
                            "errors": {},
                            "updated_at": utc_now(),
                        },
                    }
                )
            )
            await websocket.send_json(
                jsonable_encoder(
                    {
                        "type": "subscription_status",
                        "symbol": normalized,
                        "timeframe": normalized_timeframe,
                        "data": {
                            "active_symbol": normalized,
                            "active_timeframe": normalized_timeframe,
                            "subscribed_topics": topics,
                            "updated_at": utc_now(),
                        },
                    }
                )
            )

            while True:
                try:
                    raw = await asyncio.wait_for(htx.recv(), timeout=30)
                except TimeoutError:
                    await websocket.send_json(
                        jsonable_encoder(
                            {
                                "type": "source_status",
                                "symbol": normalized,
                                "data": {
                                    "providers": [],
                                    "errors": {"htx_ws": "No HTX WebSocket message received in 30 seconds."},
                                    "updated_at": utc_now(),
                                },
                            }
                        )
                    )
                    continue

                message = decode_htx_message(raw)
                if "ping" in message:
                    await htx.send(json.dumps({"pong": message["ping"]}))
                    continue
                if message.get("status") == "error":
                    await websocket.send_json(
                        jsonable_encoder(
                            {
                                "type": "source_status",
                                "symbol": normalized,
                                "data": {
                                    "providers": [],
                                    "errors": {"htx_ws": message.get("err-msg") or "HTX subscription error"},
                                    "updated_at": utc_now(),
                                },
                            }
                        )
                    )
                    continue

                channel = str(message.get("ch") or "")
                tick = message.get("tick")
                if not isinstance(tick, dict):
                    continue
                if channel not in active_topics:
                    await websocket.send_json(
                        jsonable_encoder(
                            {
                                "type": "stale_topic",
                                "symbol": normalized,
                                "timeframe": normalized_timeframe,
                                "stream": "unknown",
                                "topic": channel,
                                "data": {"updated_at": utc_now()},
                            }
                        )
                    )
                    continue
                message_ts = message.get("ts") if isinstance(message.get("ts"), int) else None

                if channel == all_topics["ticker"]:
                    data = ticker_payload(normalized, tick, message_ts)
                    data["updated_at"] = ms_to_iso(message_ts)
                    await websocket.send_json(jsonable_encoder({"type": "ticker", "symbol": normalized, "stream": "ticker", "topic": channel, "data": data}))
                elif channel == all_topics["tickerFallback"]:
                    data = bbo_ticker_payload(normalized, tick, message_ts)
                    data["updated_at"] = ms_to_iso(message_ts)
                    await websocket.send_json(jsonable_encoder({"type": "ticker", "symbol": normalized, "stream": "ticker", "topic": channel, "data": data}))
                elif channel == all_topics["kline"]:
                    data = kline_payload(normalized, normalized_timeframe, tick, message_ts)
                    data["updated_at"] = ms_to_iso(message_ts)
                    await websocket.send_json(
                        jsonable_encoder(
                            {
                                "type": "kline",
                                "symbol": normalized,
                                "timeframe": normalized_timeframe,
                                "stream": "kline",
                                "topic": channel,
                                "data": data,
                            }
                        )
                    )
                elif channel == all_topics["depth"]:
                    data = orderbook_payload(normalized, tick, depth, message_ts)
                    data["updated_at"] = ms_to_iso(message_ts)
                    await websocket.send_json(jsonable_encoder({"type": "orderbook", "symbol": normalized, "stream": "depth", "topic": channel, "data": data}))
                elif channel == all_topics["trade"]:
                    data = trades_payload(normalized, tick, message_ts)
                    data["updated_at"] = ms_to_iso(message_ts)
                    await websocket.send_json(jsonable_encoder({"type": "trades", "symbol": normalized, "stream": "trade", "topic": channel, "data": data}))
    except WebSocketDisconnect:
        return
    except Exception as exc:
        logger.warning("HTX WebSocket stream failed for %s: %s", normalized, exc)
        try:
            await send_disconnected_status(websocket, normalized, str(exc))
            await websocket.close(code=1011, reason="HTX WebSocket stream failed")
        except Exception:
            pass
    finally:
        if "htx" in locals():
            for topic in active_topics:
                try:
                    await htx.send(json.dumps({"unsub": topic, "id": f"unsub:{topic}"}))
                except Exception:
                    pass
