from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import now_utc, prefixed_id
from app.models.market_data import Kline, MarketSnapshot, OrderBookSnapshot, Symbol, TradeTick
from app.models.market_event import MarketEvent
from app.providers.market import HtxRestProvider, HtxWsProvider
from app.providers.market.base import normalize_symbol
from app.services.market_event_detector import detect_market_events, store_detected_events


def _dt_from_ms(value: int | float) -> datetime:
    return datetime.fromtimestamp(float(value) / 1000, tz=timezone.utc)


class MarketDataService:
    def __init__(self) -> None:
        self.rest_provider = HtxRestProvider()
        self.stream_provider = HtxWsProvider()

    def list_events(self, db: Session, symbol: str | None = None, limit: int = 20, source: str | None = None) -> list[MarketEvent]:
        stmt = select(MarketEvent).order_by(MarketEvent.detected_at.desc().nullslast(), MarketEvent.created_at.desc()).limit(limit)
        if symbol:
            stmt = stmt.where(MarketEvent.symbol == normalize_symbol(symbol))
        if source:
            stmt = stmt.where(MarketEvent.source == source)
        return list(db.scalars(stmt))

    def list_symbols(self, db: Session | None = None) -> list[dict[str, Any]]:
        symbols = self.rest_provider.list_symbols()
        if db:
            for item in symbols:
                record = db.get(Symbol, item["symbol"])
                if record is None:
                    record = Symbol(symbol=item["symbol"])
                    db.add(record)
                record.base_asset = item["base"]
                record.quote_asset = item["quote"]
                record.exchange_symbol = item["htx_symbol"]
                record.exchange = "htx"
                record.status = item["state"]
                record.price_precision = item.get("price_precision")
                record.amount_precision = item.get("amount_precision")
                record.updated_at = now_utc()
            db.commit()
        return symbols

    def get_ticker(self, symbol: str, db: Session | None = None, persist: bool = False) -> dict:
        ticker = self.rest_provider.get_ticker(symbol)
        if persist and db:
            snapshot = MarketSnapshot(
                id=prefixed_id("msnap"),
                symbol=ticker["symbol"],
                price=ticker["price"],
                open_24h=ticker.get("open_24h"),
                high_24h=ticker.get("high_24h"),
                low_24h=ticker.get("low_24h"),
                volume_base_24h=ticker.get("volume_base_24h"),
                volume_quote_24h=ticker.get("volume_24h"),
                change_pct_24h=ticker.get("change_24h"),
                funding_rate=ticker.get("funding_rate"),
                source=ticker["source"],
                status=ticker["status"],
                latency_ms=ticker.get("latency_ms"),
                raw_payload_json=ticker.get("raw_payload"),
            )
            db.add(snapshot)
            db.commit()
        return ticker

    def get_orderbook(self, symbol: str, depth: int = 20, db: Session | None = None, persist: bool = False) -> dict:
        orderbook = self.rest_provider.get_orderbook(symbol, depth)
        if persist and db:
            snapshot = OrderBookSnapshot(
                id=prefixed_id("ob"),
                symbol=orderbook["symbol"],
                bids_json=orderbook["bids"],
                asks_json=orderbook["asks"],
                spread=orderbook["spread"],
                mid_price=orderbook["mid_price"],
                imbalance=orderbook["imbalance"],
                liquidity_score=orderbook.get("liquidity_score", 0),
                source=orderbook["source"],
                raw_payload_json=orderbook.get("raw_payload"),
            )
            db.add(snapshot)
            db.commit()
        return orderbook

    def get_klines(self, symbol: str, timeframe: str = "1m", limit: int = 200, db: Session | None = None, persist: bool = False) -> dict:
        response = self.rest_provider.get_klines(symbol, timeframe, limit)
        if persist and db:
            for row in response["klines"]:
                open_time = _dt_from_ms(row["timestamp"])
                existing = db.scalar(
                    select(Kline).where(
                        Kline.symbol == response["symbol"],
                        Kline.interval == timeframe,
                        Kline.open_time == open_time,
                        Kline.source == response["source"],
                    )
                )
                record = existing or Kline(id=prefixed_id("kl"))
                record.symbol = response["symbol"]
                record.interval = timeframe
                record.open_time = open_time
                record.open = row["open"]
                record.high = row["high"]
                record.low = row["low"]
                record.close = row["close"]
                record.volume = row["volume"]
                record.turnover = row.get("turnover")
                record.source = response["source"]
                record.updated_at = now_utc()
                if existing is None:
                    db.add(record)
            db.commit()
        return response

    def get_trades(self, symbol: str, limit: int = 60, db: Session | None = None, persist: bool = False) -> dict:
        response = self.rest_provider.get_trades(symbol, limit)
        if persist and db:
            seen: set[tuple[str, str, str]] = set()
            for row in response["trades"]:
                key = (str(row["id"]), response["symbol"], response["source"])
                if key in seen:
                    continue
                seen.add(key)
                existing = db.scalar(
                    select(TradeTick).where(
                        TradeTick.trade_id == row["id"],
                        TradeTick.symbol == response["symbol"],
                        TradeTick.source == response["source"],
                    )
                )
                if existing:
                    continue
                db.add(
                    TradeTick(
                        id=prefixed_id("trd"),
                        trade_id=row["id"],
                        symbol=response["symbol"],
                        traded_at=_dt_from_ms(row["timestamp"]),
                        price=row["price"],
                        amount=row["amount"],
                        side=row["side"],
                        source=response["source"],
                        raw_payload_json=row,
                    )
                )
            db.commit()
        return response

    def get_indicators(self, symbol: str, timeframe: str = "1m", limit: int = 300, db: Session | None = None, persist: bool = False) -> dict[str, Any]:
        klines = self.get_klines(symbol, timeframe, limit, db=db, persist=persist)["klines"]
        closes = [float(row["close"]) for row in klines]
        volumes = [float(row["volume"]) for row in klines]

        def ma(period: int) -> float | None:
            if len(closes) < period:
                return None
            return sum(closes[-period:]) / period

        def rsi(period: int = 14) -> float | None:
            if len(closes) <= period:
                return None
            gains = []
            losses = []
            for index in range(len(closes) - period, len(closes)):
                delta = closes[index] - closes[index - 1]
                gains.append(max(delta, 0))
                losses.append(max(-delta, 0))
            avg_gain = sum(gains) / period
            avg_loss = sum(losses) / period
            if avg_loss == 0:
                return 100.0
            rs = avg_gain / avg_loss
            return 100 - 100 / (1 + rs)

        latest = klines[-1] if klines else None
        volume_average = sum(volumes[-20:]) / min(len(volumes), 20) if volumes else 0
        return {
            "symbol": normalize_symbol(symbol),
            "timeframe": timeframe,
            "ma20": ma(20),
            "ma50": ma(50),
            "ma200": ma(200),
            "rsi14": rsi(14),
            "volume": latest["volume"] if latest else None,
            "volume_average_20": volume_average,
            "source": "htx_rest_fallback",
            "status": "live",
            "updated_at": now_utc(),
            "is_mock": False,
        }

    def detect_events(self, db: Session, symbol: str, timeframe: str = "1m") -> list[MarketEvent]:
        klines = self.get_klines(symbol, timeframe, limit=300, db=db, persist=True)
        orderbook = self.get_orderbook(symbol, depth=20, db=db, persist=True)
        trades = self.get_trades(symbol, limit=60, db=db, persist=True)
        detected = detect_market_events(klines["symbol"], timeframe, klines["klines"], orderbook, trades)
        return store_detected_events(db, klines["symbol"], detected)

    def get_source_status(self) -> dict:
        rest_status = self.rest_provider.get_status()
        ws_status = self.stream_provider.get_status()
        errors = {}
        for item in (rest_status, ws_status):
            if item.get("error"):
                errors[item["source"]] = item["error"]
        return {
            "providers": [rest_status, ws_status],
            "errors": errors,
            "rest_snapshots": "enabled",
            "updated_at": now_utc(),
        }

    def websocket_snapshot(self, symbol: str, timeframe: str = "1m", depth: int = 20, streams: set[str] | None = None) -> list[dict[str, Any]]:
        normalized = normalize_symbol(symbol)
        active_streams = streams or {"ticker", "kline", "depth", "trade"}
        messages: list[dict[str, Any]] = [
            {"type": "source_status", "symbol": normalized, "data": self.get_source_status()},
        ]
        if "ticker" in active_streams:
            try:
                ticker = self.get_ticker(normalized)
                ticker["source"] = "htx_rest_fallback"
                ticker["status"] = "degraded"
                messages.append({"type": "ticker", "symbol": normalized, "stream": "ticker", "topic": "rest.ticker", "data": ticker})
            except MarketProviderError:
                pass
        if "kline" in active_streams:
            try:
                klines = self.get_klines(normalized, timeframe, 300)
                for kline in klines["klines"][-3:]:
                    messages.append(
                        {
                            "type": "kline",
                            "symbol": normalized,
                            "timeframe": timeframe,
                            "stream": "kline",
                            "topic": "rest.kline",
                            "data": {
                                "symbol": normalized,
                                "timeframe": timeframe,
                                "kline": kline,
                                "source": "htx_rest_fallback",
                                "status": "degraded",
                                "updated_at": klines["updated_at"],
                                "is_mock": False,
                            },
                        }
                    )
            except MarketProviderError:
                pass
        if "depth" in active_streams:
            try:
                orderbook = self.get_orderbook(normalized, depth)
                orderbook["source"] = "htx_rest_fallback"
                orderbook["status"] = "degraded"
                messages.append({"type": "orderbook", "symbol": normalized, "stream": "depth", "topic": "rest.depth", "data": orderbook})
            except MarketProviderError:
                pass
        if "trade" in active_streams:
            try:
                trades = self.get_trades(normalized, 60)
                trades["source"] = "htx_rest_fallback"
                trades["status"] = "degraded"
                messages.append({"type": "trades", "symbol": normalized, "stream": "trade", "topic": "rest.trade", "data": trades})
            except MarketProviderError:
                pass
        return messages
