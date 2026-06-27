from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter
from typing import Any

from app.providers.market.base import (
    MarketProvider,
    MarketProviderError,
    cumulative_levels,
    htx_symbol,
    normalize_symbol,
    orderbook_metrics,
    request_json,
    utc_now,
)

HTX_REST_BASE_URLS = ("https://api.huobi.pro", "https://api-aws.huobi.pro")
HTX_PERIOD_BY_TIMEFRAME = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "1h": "60min",
    "4h": "4hour",
    "1d": "1day",
}


def _ms_to_datetime(value: int | float | None) -> datetime:
    if not value:
        return utc_now()
    return datetime.fromtimestamp(float(value) / 1000, tz=timezone.utc)


def _seconds_to_datetime(value: int | float | None) -> datetime:
    if not value:
        return utc_now()
    return datetime.fromtimestamp(float(value), tz=timezone.utc)


def _float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


class HtxRestProvider(MarketProvider):
    name = "htx_rest"

    def _request(self, path: str, params: dict[str, Any] | None = None, timeout: float = 3.0) -> tuple[dict[str, Any], int]:
        last_error: Exception | None = None
        for base_url in HTX_REST_BASE_URLS:
            started = perf_counter()
            try:
                payload = request_json(base_url, path, params=params, timeout=timeout)
                latency_ms = round((perf_counter() - started) * 1000)
                if payload.get("status") == "error":
                    raise MarketProviderError(payload.get("err-msg") or payload.get("err_code") or "HTX REST error")
                return payload, latency_ms
            except MarketProviderError as exc:
                last_error = exc
        raise MarketProviderError(str(last_error) if last_error else "HTX REST unavailable")

    def list_symbols(self) -> list[dict[str, Any]]:
        payload, latency_ms = self._request("/v1/common/symbols", timeout=5)
        rows = payload.get("data")
        if not isinstance(rows, list):
            raise MarketProviderError("HTX symbols response is malformed")
        symbols = []
        for row in rows:
            if not isinstance(row, dict) or row.get("quote-currency") != "usdt":
                continue
            compact = str(row.get("symbol") or "").upper()
            base = str(row.get("base-currency") or "").upper()
            quote = str(row.get("quote-currency") or "USDT").upper()
            if not compact or not base:
                continue
            symbols.append(
                {
                    "symbol": f"{base}/{quote}",
                    "htx_symbol": compact.lower(),
                    "base": base,
                    "quote": quote,
                    "state": row.get("state") or "unknown",
                    "price_precision": row.get("price-precision"),
                    "amount_precision": row.get("amount-precision"),
                    "source": self.name,
                    "latency_ms": latency_ms,
                }
            )
        return symbols

    def get_ticker(self, symbol: str) -> dict[str, Any]:
        normalized = normalize_symbol(symbol)
        compact = htx_symbol(normalized)
        payload, latency_ms = self._request("/market/detail/merged", {"symbol": compact})
        tick = payload.get("tick")
        if not isinstance(tick, dict):
            raise MarketProviderError("HTX ticker response is malformed")
        close = _float(tick.get("close"))
        open_price = _float(tick.get("open"))
        change_pct = ((close - open_price) / open_price * 100) if open_price else 0.0
        updated_at = _ms_to_datetime(payload.get("ts") or tick.get("id"))
        return {
            "symbol": normalized,
            "price": close,
            "open_24h": open_price,
            "high_24h": _float(tick.get("high")),
            "low_24h": _float(tick.get("low")),
            "change_24h": round(change_pct, 6),
            "volume_24h": _float(tick.get("vol")),
            "volume_base_24h": _float(tick.get("amount")),
            "funding_rate": None,
            "funding_rate_label": "Planned",
            "source": self.name,
            "status": "live",
            "updated_at": updated_at,
            "latency_ms": latency_ms,
            "is_mock": False,
            "raw_payload": tick,
        }

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict[str, Any]:
        normalized = normalize_symbol(symbol)
        compact = htx_symbol(normalized)
        payload, latency_ms = self._request("/market/depth", {"symbol": compact, "type": "step0", "depth": depth})
        tick = payload.get("tick")
        if not isinstance(tick, dict):
            raise MarketProviderError("HTX order book response is malformed")
        bids = cumulative_levels([(_float(price), _float(size)) for price, size in tick.get("bids", [])], depth)
        asks = cumulative_levels([(_float(price), _float(size)) for price, size in tick.get("asks", [])], depth)
        metrics = orderbook_metrics(bids, asks)
        liquidity_score = min(100.0, round((bids[-1]["total"] + asks[-1]["total"]) / max(metrics["mid_price"], 1) * 100, 4)) if bids and asks else 0.0
        return {
            "symbol": normalized,
            "bids": bids,
            "asks": asks,
            **metrics,
            "liquidity_score": liquidity_score,
            "source": self.name,
            "status": "live",
            "updated_at": _ms_to_datetime(tick.get("ts") or payload.get("ts")),
            "latency_ms": latency_ms,
            "is_mock": False,
            "raw_payload": tick,
        }

    def get_klines(self, symbol: str, timeframe: str = "1m", limit: int = 200) -> dict[str, Any]:
        normalized = normalize_symbol(symbol)
        compact = htx_symbol(normalized)
        period = HTX_PERIOD_BY_TIMEFRAME.get(timeframe, "1min")
        payload, latency_ms = self._request("/market/history/kline", {"symbol": compact, "period": period, "size": limit})
        rows = payload.get("data")
        if not isinstance(rows, list):
            raise MarketProviderError("HTX kline response is malformed")
        klines = [
            {
                "timestamp": int(row.get("id") or 0) * 1000,
                "open": _float(row.get("open")),
                "high": _float(row.get("high")),
                "low": _float(row.get("low")),
                "close": _float(row.get("close")),
                "volume": _float(row.get("amount")),
                "turnover": _float(row.get("vol")),
            }
            for row in reversed(rows)
            if isinstance(row, dict)
        ]
        return {
            "symbol": normalized,
            "timeframe": timeframe,
            "klines": klines,
            "source": self.name,
            "status": "live",
            "updated_at": utc_now(),
            "latency_ms": latency_ms,
            "is_mock": False,
            "raw_payload": rows[: min(len(rows), 10)],
        }

    def get_trades(self, symbol: str, limit: int = 60) -> dict[str, Any]:
        normalized = normalize_symbol(symbol)
        compact = htx_symbol(normalized)
        payload, latency_ms = self._request("/market/history/trade", {"symbol": compact, "size": min(max(limit, 1), 200)})
        batches = payload.get("data")
        if not isinstance(batches, list):
            raise MarketProviderError("HTX trades response is malformed")
        trades = []
        for batch in batches:
            if not isinstance(batch, dict):
                continue
            for item in batch.get("data", []) or []:
                if not isinstance(item, dict):
                    continue
                traded_at = int(item.get("ts") or payload.get("ts") or utc_now().timestamp() * 1000)
                trades.append(
                    {
                        "id": str(item.get("id") or f"{traded_at}-{item.get('price')}-{item.get('amount')}"),
                        "symbol": normalized,
                        "timestamp": traded_at,
                        "price": _float(item.get("price")),
                        "amount": _float(item.get("amount")),
                        "side": "buy" if item.get("direction") == "buy" else "sell",
                    }
                )
        trades = sorted(trades, key=lambda item: item["timestamp"], reverse=True)[:limit]
        return {
            "symbol": normalized,
            "trades": trades,
            "source": self.name,
            "status": "live",
            "updated_at": _ms_to_datetime(payload.get("ts")) if payload.get("ts") else utc_now(),
            "latency_ms": latency_ms,
            "is_mock": False,
            "raw_payload": batches[: min(len(batches), 5)],
        }

    def get_status(self) -> dict[str, Any]:
        try:
            payload, latency_ms = self._request("/market/tickers", timeout=3)
            status = "live" if payload.get("status") == "ok" else "degraded"
            error = None
        except MarketProviderError as exc:
            status = "disconnected"
            latency_ms = None
            error = str(exc)
        data = {
            "source": self.name,
            "status": status,
            "updated_at": utc_now(),
            "is_mock": False,
            "supports_stream": False,
            "latency_ms": latency_ms,
        }
        if error:
            data["error"] = error
        return data

