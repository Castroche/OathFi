from __future__ import annotations

from typing import Any

from app.providers.market.base import MarketProvider, MarketProviderError, utc_now


class HtxWsProvider(MarketProvider):
    name = "htx_ws"
    supports_stream = True

    def get_ticker(self, symbol: str) -> dict[str, Any]:
        raise MarketProviderError("HTX WebSocket is a streaming provider. Use /ws/market for ticker updates.")

    def get_orderbook(self, symbol: str, depth: int = 20) -> dict[str, Any]:
        raise MarketProviderError("HTX WebSocket is a streaming provider. Use /ws/market for order book updates.")

    def get_klines(self, symbol: str, timeframe: str = "1m", limit: int = 200) -> dict[str, Any]:
        raise MarketProviderError("HTX WebSocket is a streaming provider. Use /ws/market for kline updates.")

    def get_status(self) -> dict[str, Any]:
        return {
            "source": self.name,
            "status": "available",
            "updated_at": utc_now(),
            "is_mock": False,
            "supports_stream": True,
        }
