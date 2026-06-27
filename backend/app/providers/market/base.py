from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json


class MarketProviderError(RuntimeError):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_symbol(symbol: str) -> str:
    normalized = symbol.strip().upper().replace("-", "/")
    if "/" not in normalized and normalized.endswith("USDT"):
        return f"{normalized[:-4]}/USDT"
    return normalized


def symbol_compact(symbol: str) -> str:
    return normalize_symbol(symbol).replace("/", "")


def symbol_dash(symbol: str) -> str:
    return normalize_symbol(symbol).replace("/", "-")


def htx_symbol(symbol: str) -> str:
    return symbol_compact(symbol).lower()


def cumulative_levels(levels: list[tuple[float, float]], depth: int) -> list[dict[str, float]]:
    total = 0.0
    rows: list[dict[str, float]] = []
    for price, size in levels[:depth]:
        total += size
        rows.append(
            {
                "price": round(float(price), 10),
                "size": round(float(size), 10),
                "total": round(total, 10),
            }
        )
    return rows


def orderbook_metrics(bids: list[dict[str, float]], asks: list[dict[str, float]]) -> dict[str, float]:
    if not bids or not asks:
        return {"spread": 0.0, "mid_price": 0.0, "imbalance": 0.0}
    best_bid = bids[0]["price"]
    best_ask = asks[0]["price"]
    bid_total = bids[-1]["total"]
    ask_total = asks[-1]["total"]
    total = bid_total + ask_total
    return {
        "spread": round(max(0.0, best_ask - best_bid), 10),
        "mid_price": round((best_bid + best_ask) / 2, 10),
        "imbalance": round((bid_total - ask_total) / total, 6) if total else 0.0,
    }


def request_json(base_url: str, path: str, params: dict[str, Any] | None = None, timeout: float = 1.5) -> dict[str, Any]:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(
        f"{base_url}{path}{query}",
        headers={
            "Accept": "application/json",
            "User-Agent": "OathFi/0.1 market-data-service",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise MarketProviderError(str(exc)) from exc


class MarketProvider(ABC):
    name: str
    supports_stream: bool = False

    @abstractmethod
    def get_ticker(self, symbol: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_orderbook(self, symbol: str, depth: int = 20) -> dict[str, Any]:
        raise NotImplementedError

    def get_klines(self, symbol: str, timeframe: str = "1m", limit: int = 200) -> dict[str, Any]:
        raise MarketProviderError(f"{self.name} does not provide klines")

    def get_status(self) -> dict[str, Any]:
        return {
            "source": self.name,
            "status": "disconnected",
            "updated_at": utc_now(),
            "is_mock": False,
            "supports_stream": self.supports_stream,
        }
