import { useCallback, useEffect, useRef, useState } from "react";
import { apiWsUrl } from "../api/client";
import {
  DEFAULT_BACKEND_SYMBOLS,
  fetchMarketKlines,
  fetchMarketOrderBook,
  fetchMarketTicker,
  fetchMarketTrades,
  marketConnectionStatus,
  marketDataSource,
  toMarketKlines,
  toMarketKlinePatch,
  toMarketOrderBook,
  toMarketTicker,
  toMarketTrades,
  type BackendMarketMessage,
} from "../api/market";
import { useAppStore } from "../stores/appStore";
import { useMarketDataStore } from "../stores/marketDataStore";
import type { MarketMessageMeta, MarketOrderBook, MarketTrade } from "../services/htx/htxTypes";

function buildMeta(receivedAt: number, data: { source: string; updated_at: string; status: string; is_mock: boolean }, stream?: MarketMessageMeta["stream"], topic?: string): MarketMessageMeta {
  const htxMessageTs = new Date(data.updated_at).getTime();
  return {
    wsReceivedAt: receivedAt,
    htxMessageTs,
    latencyMs: Number.isFinite(htxMessageTs) ? Math.max(0, receivedAt - htxMessageTs) : 0,
    source: marketDataSource(data),
    status: marketConnectionStatus(data.status, data.is_mock),
    isMock: data.is_mock,
    stream,
    topic,
  };
}

const WS_RECONNECT_BASE_MS = 1_500;
const WS_RECONNECT_MAX_MS = 15_000;
const FULL_MARKET_STREAMS = "ticker,kline,depth,trade";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function restMeta(
  receivedAt: number,
  data: { source: string; updated_at: string; status: string; is_mock: boolean },
  stream: MarketMessageMeta["stream"],
): MarketMessageMeta {
  return buildMeta(
    receivedAt,
    { ...data, source: "htx_rest_fallback", status: "degraded", is_mock: false },
    stream,
    `rest.${stream}`,
  );
}

export function useMarketSocket() {
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const wsRef = useRef<WebSocket | null>(null);
  const staleTimerRef = useRef(0);
  const reconnectTimerRef = useRef(0);
  const bufferedFlushTimerRef = useRef(0);
  const pendingOrderBookRef = useRef<{ orderBook: MarketOrderBook; meta: MarketMessageMeta } | null>(null);
  const pendingTradesRef = useRef<{ symbol: string; trades: MarketTrade[]; meta: MarketMessageMeta } | null>(null);
  const intentionalCloseRef = useRef(false);
  const [socketAttempt, setSocketAttempt] = useState(0);

  const flushBufferedMarketUpdates = useCallback(() => {
    const store = useMarketDataStore.getState();
    const pendingOrderBook = pendingOrderBookRef.current;
    const pendingTrades = pendingTradesRef.current;
    pendingOrderBookRef.current = null;
    pendingTradesRef.current = null;
    if (pendingOrderBook) {
      store.applyOrderBook(pendingOrderBook.orderBook, pendingOrderBook.meta);
    }
    if (pendingTrades) {
      store.applyTrades(pendingTrades.symbol, pendingTrades.trades, pendingTrades.meta);
    }
  }, []);

  const scheduleBufferedMarketFlush = useCallback(() => {
    if (bufferedFlushTimerRef.current) {
      return;
    }
    bufferedFlushTimerRef.current = window.setTimeout(() => {
      bufferedFlushTimerRef.current = 0;
      flushBufferedMarketUpdates();
    }, 200);
  }, [flushBufferedMarketUpdates]);

  useEffect(() => {
    useMarketDataStore.getState().setAvailableSymbols(DEFAULT_BACKEND_SYMBOLS);
  }, []);

  useEffect(() => {
    useAppStore.getState().setSelectedSymbol(activeSymbol);
  }, [activeSymbol]);

  useEffect(() => {
    useAppStore.getState().setSelectedTimeframe(activeTimeframe);
  }, [activeTimeframe]);

  useEffect(() => {
    const controller = new AbortController();
    const store = useMarketDataStore.getState();
    store.setConnectionStatus("connecting");
    store.setError(null);

    store.setSymbolStatus(activeSymbol, {
      status: "loading",
      dataSource: "htx_rest_fallback",
      lastUpdated: Date.now(),
      error: null,
    });

    fetchMarketTicker(activeSymbol, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }
        const ticker = toMarketTicker({ ...data, source: "htx_rest_fallback", status: "degraded", is_mock: false });
        useMarketDataStore.getState().applyTicker(ticker, restMeta(Date.now(), data, "ticker"));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          useMarketDataStore.getState().recordStreamDegraded("ticker", errorMessage(error, "Ticker seed failed"), "rest.ticker");
        }
      });

    fetchMarketKlines(activeSymbol, activeTimeframe, 300, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }
        useMarketDataStore.getState().applySnapshot(activeSymbol, {
          klines: toMarketKlines(data),
          latencyMs: data.latency_ms ?? undefined,
          dataSource: "htx_rest_fallback",
          status: "degraded",
          isMock: false,
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          useMarketDataStore.getState().recordStreamDegraded("kline", errorMessage(error, "Kline seed failed"), "rest.kline");
        }
      });

    fetchMarketOrderBook(activeSymbol, 20, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }
        useMarketDataStore.getState().applyOrderBook(toMarketOrderBook({ ...data, source: "htx_rest_fallback", status: "degraded", is_mock: false }), restMeta(Date.now(), data, "depth"));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          useMarketDataStore.getState().recordStreamDegraded("depth", errorMessage(error, "Order book seed failed"), "rest.depth");
        }
      });

    fetchMarketTrades(activeSymbol, 80, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }
        useMarketDataStore.getState().applyTrades(activeSymbol, toMarketTrades(data), restMeta(Date.now(), data, "trade"));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          useMarketDataStore.getState().recordStreamDegraded("trade", errorMessage(error, "Trade seed failed"), "rest.trade");
        }
      });

    return () => controller.abort();
  }, [activeSymbol, activeTimeframe]);

  useEffect(() => {
    window.clearTimeout(reconnectTimerRef.current);
    let socket: WebSocket | null = null;
    let opened = false;
    let closed = false;
    intentionalCloseRef.current = false;
    useMarketDataStore.getState().setConnectionStatus("connecting");

    const connectTimer = window.setTimeout(() => {
      const encodedSymbol = encodeURIComponent(activeSymbol);
      const encodedTimeframe = encodeURIComponent(activeTimeframe);
      socket = new WebSocket(apiWsUrl(`/ws/market?symbol=${encodedSymbol}&timeframe=${encodedTimeframe}&depth=20&streams=${FULL_MARKET_STREAMS}`));
      wsRef.current = socket;

      socket.onopen = () => {
        opened = true;
        useMarketDataStore.getState().setError(null);
      };

      socket.onmessage = (event) => {
      const receivedAt = Date.now();
      let message: BackendMarketMessage;
      try {
        message = JSON.parse(event.data) as BackendMarketMessage;
      } catch (error) {
        useMarketDataStore.getState().recordStreamError("ticker", error instanceof Error ? error.message : "WebSocket JSON parse failed");
        return;
      }
      const store = useMarketDataStore.getState();
      if ("symbol" in message && message.symbol && message.symbol !== store.activeSymbol) {
        store.recordStaleTopicDrop({
          wsReceivedAt: receivedAt,
          htxMessageTs: null,
          latencyMs: 0,
          source: "live_ws_htx",
          status: "stale",
          isMock: false,
          topic: "topic" in message ? message.topic : undefined,
        });
        return;
      }
      if (message.type === "subscription_status") {
        if (message.timeframe !== store.activeTimeframe) {
          return;
        }
        store.setActiveSubscriptions(message.data.subscribed_topics);
        console.info("[OathFi] HTX active subscriptions", {
          activeSymbol: message.data.active_symbol,
          activeTimeframe: message.data.active_timeframe,
          subscribedTopics: message.data.subscribed_topics,
        });
        return;
      }
      if (message.type === "stale_topic") {
        store.recordStaleTopicDrop({
          wsReceivedAt: receivedAt,
          htxMessageTs: null,
          latencyMs: 0,
          source: "live_ws_htx",
          status: "stale",
          isMock: false,
          topic: message.topic,
        });
        return;
      }
      if (message.type === "ticker") {
        const ticker = toMarketTicker(message.data);
        const meta = buildMeta(receivedAt, message.data, "ticker", message.topic);
        store.recordStreamMessage("ticker", message.topic ?? null, meta);
        store.applyTicker(ticker, meta);
      }
      if (message.type === "kline") {
        if (message.timeframe !== store.activeTimeframe) {
          store.recordStaleTopicDrop({
            wsReceivedAt: receivedAt,
            htxMessageTs: new Date(message.data.updated_at).getTime(),
            latencyMs: 0,
            source: marketDataSource(message.data),
            status: "stale",
            isMock: false,
            topic: message.topic,
          });
          return;
        }
        const meta = buildMeta(receivedAt, message.data, "kline", message.topic);
        store.recordStreamMessage("kline", message.topic ?? null, meta);
        store.applyKline(message.symbol, message.timeframe, toMarketKlinePatch(message.data), meta);
      }
      if (message.type === "orderbook") {
        const orderBook = toMarketOrderBook(message.data);
        const meta = buildMeta(receivedAt, message.data, "depth", message.topic);
        store.recordStreamMessage("depth", message.topic ?? null, meta);
        pendingOrderBookRef.current = { orderBook, meta };
        scheduleBufferedMarketFlush();
      }
      if (message.type === "trades") {
        const meta = buildMeta(receivedAt, message.data, "trade", message.topic);
        const nextTrades = toMarketTrades(message.data);
        store.recordStreamMessage("trade", message.topic ?? null, meta);
        const pending = pendingTradesRef.current;
        pendingTradesRef.current = pending && pending.symbol === message.symbol
          ? {
              symbol: message.symbol,
              trades: Array.from(new Map([...nextTrades, ...pending.trades].map((trade) => [trade.id, trade])).values()).slice(0, 100),
              meta,
            }
          : { symbol: message.symbol, trades: nextTrades, meta };
        scheduleBufferedMarketFlush();
      }
      };

      socket.onerror = () => {
        if (!intentionalCloseRef.current && opened) {
          useMarketDataStore.getState().setError("Backend market WebSocket error");
        }
      };

      socket.onclose = () => {
        const store = useMarketDataStore.getState();
        const wasIntentional = intentionalCloseRef.current || closed;
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        if (!wasIntentional && opened) {
          store.applyFallback(activeSymbol, "Backend market WebSocket disconnected");
          const retryDelay = Math.min(WS_RECONNECT_MAX_MS, WS_RECONNECT_BASE_MS * 2 ** Math.min(socketAttempt, 4));
          reconnectTimerRef.current = window.setTimeout(() => {
            useMarketDataStore.getState().recordReconnect();
            setSocketAttempt((attempt) => attempt + 1);
          }, retryDelay);
        }
      };
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      intentionalCloseRef.current = true;
      closed = true;
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
      window.clearTimeout(reconnectTimerRef.current);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
    };
  }, [activeSymbol, activeTimeframe, scheduleBufferedMarketFlush, socketAttempt]);

  useEffect(() => () => {
    window.clearTimeout(bufferedFlushTimerRef.current);
    bufferedFlushTimerRef.current = 0;
    pendingOrderBookRef.current = null;
    pendingTradesRef.current = null;
  }, []);

  useEffect(() => {
    staleTimerRef.current = window.setInterval(() => {
      const store = useMarketDataStore.getState();
      store.refreshLatencyAges();
      if (!store.lastUpdated) {
        return;
      }
      if (Date.now() - store.lastUpdated > 15_000 && store.connectionStatus !== "fallback") {
        const reason = "Market data stream exceeded 15 seconds without an update";
        (["ticker", "kline", "depth", "trade"] as const).forEach((stream) => {
          store.recordStreamDegraded(stream, reason);
        });
        store.setSymbolStatus(store.activeSymbol, {
          status: "degraded",
          dataSource: "htx_rest_fallback",
          lastUpdated: store.lastUpdated,
          error: reason,
        });
      }
    }, 3_000);
    return () => window.clearInterval(staleTimerRef.current);
  }, []);
}
