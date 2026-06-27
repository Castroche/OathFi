from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.market_event import MarketEvent
from app.providers.market.base import normalize_symbol


@dataclass(frozen=True)
class DetectedMarketEvent:
    event_type: str
    title: str
    summary: str
    severity: int
    raw_payload: dict[str, Any]


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _latest_closed(klines: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not klines:
        return None
    return klines[-1]


def _ma(klines: list[dict[str, Any]], period: int) -> float | None:
    if len(klines) < period:
        return None
    closes = [float(row["close"]) for row in klines[-period:]]
    return _mean(closes)


def detect_market_events(
    symbol: str,
    timeframe: str,
    klines: list[dict[str, Any]],
    orderbook: dict[str, Any] | None,
    trades: dict[str, Any] | None,
) -> list[DetectedMarketEvent]:
    normalized = normalize_symbol(symbol)
    latest = _latest_closed(klines)
    if latest is None:
        return []

    events: list[DetectedMarketEvent] = []
    recent_volumes = [float(row.get("volume") or 0) for row in klines[-21:-1]]
    latest_volume = float(latest.get("volume") or 0)
    baseline_volume = _mean(recent_volumes)
    close = float(latest.get("close") or 0)
    high_window = max((float(row.get("high") or 0) for row in klines[-21:-1]), default=0)
    ma20 = _ma(klines, 20)
    ma50 = _ma(klines, 50)
    ma200 = _ma(klines, 200)
    imbalance = float((orderbook or {}).get("imbalance") or 0)
    spread = float((orderbook or {}).get("spread") or 0)
    mid_price = float((orderbook or {}).get("mid_price") or close or 1)
    spread_bps = (spread / mid_price * 10_000) if mid_price else 0
    trade_rows = (trades or {}).get("trades") or []
    notional = sum(float(row.get("price") or 0) * float(row.get("amount") or 0) for row in trade_rows if isinstance(row, dict))

    if baseline_volume > 0 and latest_volume >= baseline_volume * 1.8:
        multiple = latest_volume / baseline_volume
        events.append(
            DetectedMarketEvent(
                event_type="volume_spike",
                title="Volume Spike",
                summary=f"{normalized} {timeframe} volume is {multiple:.2f}x the prior 20-candle average.",
                severity=min(5, max(2, round(multiple))),
                raw_payload={
                    "latest_volume": latest_volume,
                    "baseline_volume": baseline_volume,
                    "multiple": multiple,
                    "latest": latest,
                },
            )
        )

    if high_window > 0 and close >= high_window * 0.998 and (ma20 is None or close >= ma20):
        events.append(
            DetectedMarketEvent(
                event_type="breakout_watch",
                title="Breakout Watch",
                summary=f"{normalized} close is testing the recent range high with MA20 support.",
                severity=4 if imbalance > 0 else 3,
                raw_payload={
                    "close": close,
                    "range_high": high_window,
                    "ma20": ma20,
                    "ma50": ma50,
                    "ma200": ma200,
                    "imbalance": imbalance,
                },
            )
        )

    if abs(imbalance) >= 0.22 or spread_bps >= 4:
        side = "bid" if imbalance > 0 else "ask"
        events.append(
            DetectedMarketEvent(
                event_type="liquidity_shift",
                title="Liquidity Shift",
                summary=f"{normalized} visible {side}-side depth imbalance is {imbalance * 100:.1f}% with spread at {spread_bps:.2f} bps.",
                severity=4 if abs(imbalance) >= 0.35 or spread_bps >= 8 else 3,
                raw_payload={
                    "imbalance": imbalance,
                    "spread": spread,
                    "spread_bps": spread_bps,
                    "liquidity_score": (orderbook or {}).get("liquidity_score"),
                },
            )
        )

    if notional > 0 and trade_rows:
        avg_notional = notional / len(trade_rows)
        if avg_notional >= 5_000:
            events.append(
                DetectedMarketEvent(
                    event_type="agent_analysis",
                    title="Agent Analysis",
                    summary=f"{normalized} has fresh trade, kline, and depth context ready for hypothesis generation.",
                    severity=2,
                    raw_payload={
                        "trade_count": len(trade_rows),
                        "average_notional": avg_notional,
                        "timeframe": timeframe,
                    },
                )
            )

    return events


def store_detected_events(
    db: Session,
    symbol: str,
    events: list[DetectedMarketEvent],
    detected_at: datetime | None = None,
    source: str = "htx_rest_detector",
) -> list[MarketEvent]:
    normalized = normalize_symbol(symbol)
    detected_at = detected_at or now_utc()
    stored: list[MarketEvent] = []
    for event in events:
        record = MarketEvent(
            id=prefixed_id("mevt"),
            symbol=normalized,
            event_type=event.event_type,
            title=event.title,
            summary=event.summary,
            severity=event.severity,
            detected_at=detected_at,
            source=source,
            status="live",
            is_mock=False,
            raw_payload_json=event.raw_payload,
        )
        db.add(record)
        stored.append(record)
    db.commit()
    for record in stored:
        db.refresh(record)
    return stored

