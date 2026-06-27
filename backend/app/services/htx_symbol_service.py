from __future__ import annotations

from datetime import datetime, timezone
from time import time
from typing import Any

from app.providers.market.base import MarketProviderError, request_json

HTX_REST_BASE_URLS = ("https://api-aws.huobi.pro", "https://api.huobi.pro")
SYMBOLS_TTL_SECONDS = 10 * 60
TICKERS_TTL_SECONDS = 5
COMMON_QUOTES = ("USDT", "USDC", "BTC", "ETH", "HTX", "TRX", "USDD")


def _float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _utc_ms() -> int:
    return int(time() * 1000)


def _ms_to_iso(value: int | float | None) -> str:
    if value is None:
        return datetime.now(timezone.utc).isoformat()
    return datetime.fromtimestamp(float(value) / 1000, tz=timezone.utc).isoformat()


def _display_symbol(compact: str, base: str | None = None, quote: str | None = None) -> str:
    if base and quote:
        return f"{base.upper()}/{quote.upper()}"
    lower = compact.lower()
    quote_token = next((candidate.lower() for candidate in COMMON_QUOTES if lower.endswith(candidate.lower())), "")
    if quote_token:
        return f"{lower[:-len(quote_token)].upper()}/{quote_token.upper()}"
    return compact.upper()


def _is_online(row: dict[str, Any]) -> bool:
    state = str(row.get("state") or row.get("sc") or row.get("te") or "").lower()
    trade_enabled = row.get("trade-enabled")
    if trade_enabled is False:
        return False
    return state in {"online", "tradable", "enabled", "1"} or not state


class HtxSymbolService:
    def __init__(self) -> None:
        self._symbols_cache: dict[str, Any] | None = None
        self._symbols_cache_at = 0.0
        self._tickers_cache: dict[str, Any] | None = None
        self._tickers_cache_at = 0.0

    def _request(self, path: str, params: dict[str, Any] | None = None, timeout: float = 5.0) -> dict[str, Any]:
        last_error: Exception | None = None
        for base_url in HTX_REST_BASE_URLS:
            try:
                payload = request_json(base_url, path, params=params, timeout=timeout)
                if payload.get("status") == "error":
                    raise MarketProviderError(payload.get("err-msg") or payload.get("err_code") or "HTX REST error")
                return payload
            except MarketProviderError as exc:
                last_error = exc
        raise MarketProviderError(str(last_error) if last_error else "HTX REST unavailable")

    def _fallback_symbols(self) -> list[dict[str, Any]]:
        return [
            self._normalize_symbol(
                {
                    "symbol": symbol.replace("/", "").lower(),
                    "base-currency": symbol.split("/")[0].lower(),
                    "quote-currency": symbol.split("/")[1].lower(),
                    "state": "online",
                    "price-precision": 10 if symbol == "HTX/USDT" else 2,
                    "amount-precision": 6,
                    "value-precision": 8,
                }
            )
            for symbol in ("BTC/USDT", "ETH/USDT", "HTX/USDT", "SOL/USDT")
        ]

    def _normalize_symbol(self, row: dict[str, Any]) -> dict[str, Any]:
        compact = str(row.get("symbol") or row.get("bc") or "").lower()
        base = str(row.get("base-currency") or row.get("bcdn") or row.get("base") or "").upper()
        quote = str(row.get("quote-currency") or row.get("qcdn") or row.get("quote") or "").upper()
        display = _display_symbol(compact, base or None, quote or None)
        base, quote = display.split("/", 1) if "/" in display else (display, "")
        return {
            "symbol": display,
            "htxSymbol": compact or display.replace("/", "").lower(),
            "base": base,
            "quote": quote,
            "state": "online",
            "displayName": display,
            "searchText": f"{base.lower()} {(compact or display.replace('/', '').lower())} {display}",
            "pricePrecision": _int(row.get("price-precision") or row.get("pp")) or 8,
            "amountPrecision": _int(row.get("amount-precision") or row.get("ap")) or 6,
            "valuePrecision": _int(row.get("value-precision") or row.get("vp")) or 8,
            "minOrderAmount": str(row.get("min-order-amt") or row.get("minoa") or ""),
            "maxOrderAmount": str(row.get("max-order-amt") or row.get("maxoa") or ""),
        }

    def _fetch_symbols(self) -> dict[str, Any]:
        try:
            payload = self._request("/v2/settings/common/symbols", timeout=6)
        except MarketProviderError:
            payload = self._request("/v1/common/symbols", timeout=6)
        rows = payload.get("data")
        if not isinstance(rows, list):
            raise MarketProviderError("HTX symbols response is malformed")
        symbols = []
        seen: set[str] = set()
        for row in rows:
            if not isinstance(row, dict) or not _is_online(row):
                continue
            symbol = self._normalize_symbol(row)
            if "/" not in symbol["symbol"] or symbol["symbol"] in seen:
                continue
            seen.add(symbol["symbol"])
            symbols.append(symbol)
        symbols.sort(key=lambda item: (item["quote"] != "USDT", item["quote"], item["symbol"]))
        return {
            "exchange": "htx",
            "symbols": symbols,
            "source": "htx_symbol_registry",
            "updatedAt": _utc_ms(),
        }

    def get_symbols(self, quote: str | None = None) -> dict[str, Any]:
        now = time()
        if self._symbols_cache is None or now - self._symbols_cache_at > SYMBOLS_TTL_SECONDS:
            try:
                self._symbols_cache = self._fetch_symbols()
            except MarketProviderError:
                self._symbols_cache = {
                    "exchange": "htx",
                    "symbols": self._fallback_symbols(),
                    "source": "fallback",
                    "updatedAt": _utc_ms(),
                }
            self._symbols_cache_at = time()

        result = dict(self._symbols_cache)
        symbols = list(result["symbols"])
        if quote:
            normalized_quote = quote.upper()
            symbols = [symbol for symbol in symbols if symbol["quote"] == normalized_quote]
        result["symbols"] = symbols
        return result

    def _fetch_tickers(self) -> dict[str, Any]:
        payload = self._request("/market/tickers", timeout=4)
        rows = payload.get("data")
        if not isinstance(rows, list):
            raise MarketProviderError("HTX tickers response is malformed")
        timestamp = _int(payload.get("ts")) or _utc_ms()
        tickers = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            compact = str(row.get("symbol") or "").lower()
            if not compact:
                continue
            display = _display_symbol(compact)
            open_price = _float(row.get("open"))
            last = _float(row.get("close"))
            change = last - open_price
            tickers.append(
                {
                    "symbol": display,
                    "htxSymbol": compact,
                    "last": last,
                    "open": open_price,
                    "high": _float(row.get("high")),
                    "low": _float(row.get("low")),
                    "volume": _float(row.get("amount")),
                    "quoteVolume": _float(row.get("vol")),
                    "change": change,
                    "changePercent": (change / open_price * 100) if open_price else 0,
                    "bid": _float(row.get("bid")),
                    "ask": _float(row.get("ask")),
                    "timestamp": timestamp,
                    "updatedAt": _ms_to_iso(timestamp),
                    "source": "htx_rest_ticker_cache",
                }
            )
        return {
            "exchange": "htx",
            "tickers": tickers,
            "source": "htx_rest_ticker_cache",
            "updatedAt": timestamp,
        }

    def get_tickers(self, symbols: str | None = None) -> dict[str, Any]:
        now = time()
        if self._tickers_cache is None or now - self._tickers_cache_at > TICKERS_TTL_SECONDS:
            self._tickers_cache = self._fetch_tickers()
            self._tickers_cache_at = time()

        result = dict(self._tickers_cache)
        tickers = list(result["tickers"])
        if symbols:
            requested = {item.strip().upper().replace("-", "/") for item in symbols.split(",") if item.strip()}
            tickers = [ticker for ticker in tickers if ticker["symbol"] in requested]
        result["tickers"] = tickers
        return result
