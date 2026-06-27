from __future__ import annotations

from datetime import timezone
from math import sqrt
from typing import Any

from sqlalchemy.orm import Session

from app.db.base import now_utc
from app.providers.market import MarketProviderError
from app.services.market_data_service import MarketDataService
from app.services.news_service import NewsService


def _ema(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    multiplier = 2 / (period + 1)
    series = [values[0]]
    for value in values[1:]:
        series.append((value - series[-1]) * multiplier + series[-1])
    return series


def _correlation(left: list[float], right: list[float]) -> float | None:
    sample = min(len(left), len(right))
    if sample < 6:
        return None
    x = left[-sample:]
    y = right[-sample:]
    mean_x = sum(x) / sample
    mean_y = sum(y) / sample
    numerator = sum((a - mean_x) * (b - mean_y) for a, b in zip(x, y))
    denom_x = sqrt(sum((a - mean_x) ** 2 for a in x))
    denom_y = sqrt(sum((b - mean_y) ** 2 for b in y))
    if denom_x == 0 or denom_y == 0:
        return None
    return numerator / (denom_x * denom_y)


def _returns(closes: list[float]) -> list[float]:
    rows: list[float] = []
    for index in range(1, len(closes)):
        previous = closes[index - 1]
        if previous:
            rows.append((closes[index] - previous) / previous)
    return rows


class AgentContextService:
    def __init__(self) -> None:
        self.market = MarketDataService()
        self.news = NewsService()

    def get_context(self, db: Session, symbol: str = "ETH/USDT", timeframe: str = "15m") -> dict[str, Any]:
        ticker = self.market.get_ticker(symbol, db=db, persist=True)
        orderbook = self.market.get_orderbook(symbol, depth=20, db=db, persist=True)
        klines = self.market.get_klines(symbol, timeframe, limit=240, db=db, persist=True)
        indicators = self.market.get_indicators(symbol, timeframe, limit=240, db=db, persist=False)
        trades = self.market.get_trades(symbol, limit=60, db=db, persist=True)
        market_events = self.market.list_events(db, symbol=symbol, limit=6)
        if not market_events:
            try:
                market_events = self.market.detect_events(db, symbol=symbol, timeframe=timeframe)
            except MarketProviderError:
                market_events = []
        news_events = self.news.latest(language="en", limit=8)

        closes = [float(row["close"]) for row in klines["klines"] if row.get("close") is not None]
        highs = [float(row["high"]) for row in klines["klines"] if row.get("high") is not None]
        lows = [float(row["low"]) for row in klines["klines"] if row.get("low") is not None]
        macd = self._macd(closes)
        btc_correlation = self._btc_correlation(symbol, timeframe, closes)
        recent_events = self._recent_events(market_events, news_events)

        price = ticker.get("price")
        volume_average = indicators.get("volume_average_20")
        latest_volume = indicators.get("volume")
        key_levels = {
            "recent_high": max(highs[-60:]) if highs else None,
            "recent_low": min(lows[-60:]) if lows else None,
            "ma20": indicators.get("ma20"),
            "ma50": indicators.get("ma50"),
            "ma200": indicators.get("ma200"),
        }
        context = {
            "symbol": ticker["symbol"],
            "timeframe": timeframe,
            "asset": ticker["symbol"].split("/", 1)[0],
            "current_price": price,
            "key_levels": key_levels,
            "volume": {
                "latest": latest_volume,
                "average_20": volume_average,
                "ratio_to_20ma": (latest_volume / volume_average) if latest_volume and volume_average else None,
                "volume_24h": ticker.get("volume_24h"),
            },
            "rsi": indicators.get("rsi14"),
            "macd": macd,
            "order_book_summary": {
                "spread": orderbook.get("spread"),
                "mid_price": orderbook.get("mid_price"),
                "imbalance": orderbook.get("imbalance"),
                "liquidity_score": orderbook.get("liquidity_score"),
                "best_bid": orderbook.get("bids", [{}])[0].get("price") if orderbook.get("bids") else None,
                "best_ask": orderbook.get("asks", [{}])[0].get("price") if orderbook.get("asks") else None,
            },
            "btc_correlation": btc_correlation,
            "funding_rate": {
                "value": ticker.get("funding_rate"),
                "label": ticker.get("funding_rate_label") or ("Connected" if ticker.get("funding_rate") is not None else "Planned"),
            },
            "recent_events": recent_events,
            "ticker": ticker,
            "indicators": indicators,
            "klines": klines,
            "trades": trades,
            "source": "htx_rest",
            "status": "live",
            "is_mock": False,
            "updated_at": now_utc(),
        }
        return context

    def _macd(self, closes: list[float]) -> dict[str, Any]:
        if len(closes) < 35:
            return {"value": None, "signal": None, "histogram": None, "status": "insufficient_data"}
        fast = _ema(closes, 12)
        slow = _ema(closes, 26)
        macd_line = [fast_value - slow_value for fast_value, slow_value in zip(fast[-len(slow):], slow)]
        signal_line = _ema(macd_line, 9)
        value = macd_line[-1]
        signal = signal_line[-1]
        return {
            "value": value,
            "signal": signal,
            "histogram": value - signal,
            "status": "bullish" if value > signal else "bearish",
        }

    def _btc_correlation(self, symbol: str, timeframe: str, closes: list[float]) -> dict[str, Any]:
        if symbol.upper() == "BTC/USDT":
            return {"value": 1.0, "sample": len(closes), "source": "same_asset"}
        try:
            btc_klines = self.market.get_klines("BTC/USDT", timeframe, limit=min(max(len(closes), 60), 240))
        except MarketProviderError:
            return {"value": None, "sample": 0, "source": "htx_rest", "status": "unavailable"}
        btc_closes = [float(row["close"]) for row in btc_klines["klines"] if row.get("close") is not None]
        left = _returns(closes)
        right = _returns(btc_closes)
        value = _correlation(left, right)
        return {
            "value": value,
            "sample": min(len(left), len(right)),
            "source": "htx_rest",
            "status": "live" if value is not None else "insufficient_data",
        }

    def _recent_events(self, market_events: list[Any], news_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for event in market_events[:6]:
            rows.append(
                {
                    "id": event.id,
                    "title": event.title,
                    "summary": event.summary,
                    "source": event.source,
                    "category": event.event_type,
                    "severity": event.severity,
                    "created_at": event.created_at,
                    "is_mock": event.is_mock,
                }
            )
        for event in news_events[:6]:
            rows.append(
                {
                    "id": event["id"],
                    "title": event["title"],
                    "summary": event["summary"],
                    "source": event["source"],
                    "category": event["category"],
                    "severity": event["severity"],
                    "created_at": event["published_at"],
                    "is_mock": event["is_mock"],
                }
            )
        rows.sort(key=lambda item: self._sort_timestamp(item["created_at"]), reverse=True)
        return rows[:10]

    @staticmethod
    def _sort_timestamp(value: Any) -> float:
        if hasattr(value, "timestamp"):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return float(value.timestamp())
        return 0.0
