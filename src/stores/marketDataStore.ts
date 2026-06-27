import { create } from "zustand";
import {
  DEFAULT_SYMBOLS,
  HTX_PERIOD_BY_TIMEFRAME,
  type CandlePatchSource,
  type ConnectionStatus,
  type HtxSymbol,
  type HtxTimeframe,
  type MarketDataSource,
  type MarketKline,
  type MarketLatencyMetrics,
  type MarketMessageMeta,
  type MarketOrderBook,
  type MarketTicker,
  type MarketTrade,
  type StreamDiagnostic,
  type StreamName,
  type SymbolLiveStatus,
} from "../services/htx/htxTypes";
import { toHtxSymbol } from "../services/htx/htxAdapter";

type MarketSnapshot = {
  ticker?: MarketTicker;
  klines?: MarketKline[];
  orderBook?: MarketOrderBook;
  trades?: MarketTrade[];
  latencyMs?: number;
  dataSource?: MarketDataSource;
  status?: ConnectionStatus;
  isMock?: boolean;
};

type KlineUpdate = {
  sequence: number;
  symbol: string;
  timeframe: HtxTimeframe;
  kline: MarketKline;
  source: CandlePatchSource;
  wsReceivedAt: number | null;
  htxMessageTs: number | null;
  storeUpdatedAt: number;
  latestTradeTs: number | null;
};

export type SymbolStatus = {
  status: SymbolLiveStatus;
  dataSource: MarketDataSource;
  lastUpdated: number | null;
  latencyMs: number | null;
  error: string | null;
};

type MarketDataState = {
  activeSymbol: string;
  activeTimeframe: HtxTimeframe;
  availableSymbols: HtxSymbol[];
  favorites: string[];
  recentSymbols: string[];
  ticker: MarketTicker | null;
  topTickers: Record<string, MarketTicker | undefined>;
  symbolStatuses: Record<string, SymbolStatus | undefined>;
  klines: MarketKline[];
  orderBook: MarketOrderBook | null;
  trades: MarketTrade[];
  connectionStatus: ConnectionStatus;
  dataSource: MarketDataSource;
  lastUpdated: number | null;
  latencyMs: number | null;
  error: string | null;
  isFallbackMode: boolean;
  snapshotVersion: number;
  lastKlineUpdate: KlineUpdate | null;
  latencyMetrics: MarketLatencyMetrics;
  streamDiagnostics: Record<StreamName, StreamDiagnostic>;
  activeSubscriptions: Record<string, string>;
  subscribedTopics: string[];
  reconnectCount: number;
  setActiveSymbol: (symbol: string) => void;
  setActiveTimeframe: (timeframe: HtxTimeframe) => void;
  setAvailableSymbols: (symbols: HtxSymbol[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSymbolStatus: (symbol: string, status: Partial<SymbolStatus>) => void;
  setError: (error: string | null) => void;
  applyTopTicker: (ticker: MarketTicker, status?: Partial<SymbolStatus>) => void;
  applyTopTickerFallback: (symbol: string, reason: string) => void;
  applySnapshot: (symbol: string, snapshot: MarketSnapshot) => void;
  applyTicker: (ticker: MarketTicker, meta?: MarketMessageMeta) => void;
  applyKline: (symbol: string, timeframe: HtxTimeframe, kline: MarketKline, meta?: MarketMessageMeta) => void;
  applyOrderBook: (orderBook: MarketOrderBook, meta?: MarketMessageMeta) => void;
  applyTrades: (symbol: string, trades: MarketTrade[], meta?: MarketMessageMeta) => void;
  recordChartUpdate: (update: KlineUpdate) => void;
  recordStaleTopicDrop: (meta: MarketMessageMeta) => void;
  recordStreamMessage: (stream: StreamName, topic: string | null, meta?: MarketMessageMeta) => void;
  recordStreamDegraded: (stream: StreamName, error: string, topic?: string | null) => void;
  recordStreamError: (stream: StreamName, error: string, topic?: string | null) => void;
  setActiveSubscriptions: (subscriptions: Record<string, string>) => void;
  recordReconnect: () => void;
  refreshLatencyAges: () => void;
  applyFallback: (symbol: string, reason: string) => void;
  clearSymbolData: (symbol: string) => void;
};

function createFallbackSymbols(): HtxSymbol[] {
  return DEFAULT_SYMBOLS.map((symbol) => {
    const [base = "", quote = "USDT"] = symbol.split("/");
    return {
      symbol,
      htxSymbol: toHtxSymbol(symbol),
      base,
      quote,
      state: "fallback",
      pricePrecision: symbol === "HTX/USDT" ? 10 : 2,
      amountPrecision: 6,
    };
  });
}

function createInitialSymbolStatuses(): Record<string, SymbolStatus> {
  return Object.fromEntries(
    DEFAULT_SYMBOLS.map((symbol) => [
      symbol,
      {
        status: "loading",
        dataSource: "htx_rest_fallback",
        lastUpdated: null,
        latencyMs: null,
        error: null,
      },
    ]),
  );
}

function clampKlines(klines: MarketKline[]) {
  return klines.slice(-1_000);
}

function createLatencyMetrics(): MarketLatencyMetrics {
  return {
    wsReceivedAt: null,
    htxMessageTs: null,
    storeUpdatedAt: null,
    chartUpdatedAt: null,
    wsToStoreLatencyMs: null,
    storeToChartLatencyMs: null,
    totalRenderLatencyMs: null,
    lastTradeAgeMs: null,
    lastTickerAgeMs: null,
    lastKlineAgeMs: null,
    lastDepthAgeMs: null,
    lastCandlePatchAgeMs: null,
    lastOrderBookAgeMs: null,
    lastTradeTs: null,
    lastCandlePatchAt: null,
    lastOrderBookAt: null,
    lastTradeToCandlePatchLatencyMs: null,
    chartUpdateIntervalMs: null,
    chartUpdateIntervalAvgMs: null,
    chartUpdateIntervalMaxMs: null,
    chartUpdateCount: 0,
    orderBookUpdateIntervalMs: null,
    orderBookUpdateIntervalAvgMs: null,
    orderBookUpdateIntervalMaxMs: null,
    orderBookUpdateCount: 0,
    staleTopicDrops: 0,
  };
}

function createStreamDiagnostic(topic: string | null = null): StreamDiagnostic {
  return {
    status: "stale",
    lastMessageAt: null,
    lastMessageAgeMs: null,
    messageCount: 0,
    lastParseError: null,
    subscribedTopic: topic,
    isStale: true,
  };
}

function createStreamDiagnostics(): Record<StreamName, StreamDiagnostic> {
  return {
    ticker: createStreamDiagnostic(),
    kline: createStreamDiagnostic(),
    trade: createStreamDiagnostic(),
    depth: createStreamDiagnostic(),
    chartPatch: createStreamDiagnostic(),
  };
}

const STREAM_STALE_MS: Record<StreamName, number> = {
  ticker: 5_000,
  kline: 5_000,
  trade: 5_000,
  depth: 5_000,
  chartPatch: 5_000,
};

function updateStreamAge(stream: StreamName, diagnostic: StreamDiagnostic, now: number): StreamDiagnostic {
  const age = diagnostic.lastMessageAt ? Math.max(0, now - diagnostic.lastMessageAt) : null;
  const isStale = age === null || age > STREAM_STALE_MS[stream];
  return {
    ...diagnostic,
    lastMessageAgeMs: age,
    isStale,
    status: diagnostic.status === "error" && diagnostic.lastParseError
      ? "error"
      : isStale
        ? "stale"
        : diagnostic.status === "fallback"
          ? "fallback"
          : "live",
  };
}

function refreshDiagnostics(diagnostics: Record<StreamName, StreamDiagnostic>, now: number) {
  return Object.fromEntries(
    (Object.entries(diagnostics) as Array<[StreamName, StreamDiagnostic]>).map(([stream, diagnostic]) => [
      stream,
      updateStreamAge(stream, diagnostic, now),
    ]),
  ) as Record<StreamName, StreamDiagnostic>;
}

function marketStatusFromDiagnostics(diagnostics: Record<StreamName, StreamDiagnostic>, fallback = false): ConnectionStatus {
  if (fallback) {
    return "fallback";
  }
  const coreStreams: StreamName[] = ["ticker", "kline", "trade", "depth", "chartPatch"];
  if (coreStreams.some((stream) => diagnostics[stream].status === "error")) {
    return "error";
  }
  const liveCount = coreStreams.filter((stream) => diagnostics[stream].status === "live").length;
  const fallbackCount = coreStreams.filter((stream) => diagnostics[stream].status === "fallback").length;
  if (liveCount === coreStreams.length) {
    return "live";
  }
  if (liveCount > 0) {
    return "degraded";
  }
  if (fallbackCount > 0) {
    return "disconnected";
  }
  return "stale";
}

function timeframeMs(timeframe: HtxTimeframe) {
  const period = HTX_PERIOD_BY_TIMEFRAME[timeframe];
  switch (period) {
    case "1min":
      return 60_000;
    case "5min":
      return 5 * 60_000;
    case "15min":
      return 15 * 60_000;
    case "60min":
      return 60 * 60_000;
    case "4hour":
      return 4 * 60 * 60_000;
    case "1day":
      return 24 * 60 * 60_000;
    default:
      return 60_000;
  }
}

function candleTimestamp(timestamp: number, timeframe: HtxTimeframe) {
  const duration = timeframeMs(timeframe);
  return Math.floor(timestamp / duration) * duration;
}

function updateKlineArray(klines: MarketKline[], next: MarketKline) {
  const last = klines[klines.length - 1];
  if (!last) {
    return [next];
  }
  if (last.timestamp === next.timestamp) {
    return [...klines.slice(0, -1), next];
  }
  if (last.timestamp < next.timestamp) {
    return clampKlines([...klines, next]);
  }
  return klines;
}

function getCurrentCandle(state: MarketDataState, symbol: string, timeframe: HtxTimeframe) {
  if (
    state.lastKlineUpdate?.symbol === symbol &&
    state.lastKlineUpdate.timeframe === timeframe
  ) {
    return state.lastKlineUpdate.kline;
  }
  return state.klines[state.klines.length - 1] ?? null;
}

function patchCandle(
  current: MarketKline | null,
  timeframe: HtxTimeframe,
  price: number,
  timestamp: number,
  volumeDelta = 0,
): { kline: MarketKline; shouldPersistInHistory: boolean } {
  const nextTimestamp = candleTimestamp(timestamp, timeframe);
  if (!current || current.timestamp < nextTimestamp) {
    return {
      kline: {
        timestamp: nextTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: Math.max(0, volumeDelta),
      },
      shouldPersistInHistory: true,
    };
  }

  if (current.timestamp > nextTimestamp) {
    return { kline: current, shouldPersistInHistory: false };
  }

  return {
    kline: {
      ...current,
      high: Math.max(current.high, price),
      low: Math.min(current.low, price),
      close: price,
      volume: current.volume + Math.max(0, volumeDelta),
    },
    shouldPersistInHistory: false,
  };
}

function withMessageMetrics(
  metrics: MarketLatencyMetrics,
  meta: MarketMessageMeta | undefined,
  storeUpdatedAt: number,
) {
  if (!meta) {
    return metrics;
  }
  return {
    ...metrics,
    wsReceivedAt: meta.wsReceivedAt,
    htxMessageTs: meta.htxMessageTs,
    storeUpdatedAt,
    wsToStoreLatencyMs: Math.max(0, storeUpdatedAt - meta.wsReceivedAt),
  };
}

function updateIntervalAverage(previousAverage: number | null, previousCount: number, nextInterval: number) {
  if (previousAverage === null || previousCount === 0) {
    return nextInterval;
  }
  return (previousAverage * previousCount + nextInterval) / (previousCount + 1);
}

export const useMarketDataStore = create<MarketDataState>((set, get) => ({
  activeSymbol: "ETH/USDT",
  activeTimeframe: "1m",
  availableSymbols: createFallbackSymbols(),
  favorites: [...DEFAULT_SYMBOLS],
  recentSymbols: ["ETH/USDT", "BTC/USDT", "HTX/USDT"],
  ticker: null,
  topTickers: {},
  symbolStatuses: createInitialSymbolStatuses(),
  klines: [],
  orderBook: null,
  trades: [],
  connectionStatus: "connecting",
  dataSource: "htx_rest_fallback",
  lastUpdated: null,
  latencyMs: null,
  error: null,
  isFallbackMode: false,
  snapshotVersion: 0,
  lastKlineUpdate: null,
  latencyMetrics: createLatencyMetrics(),
  streamDiagnostics: createStreamDiagnostics(),
  activeSubscriptions: {},
  subscribedTopics: [],
  reconnectCount: 0,

  setActiveSymbol: (activeSymbol) =>
    set((state) => ({
      activeSymbol,
      recentSymbols: [activeSymbol, ...state.recentSymbols.filter((symbol) => symbol !== activeSymbol)].slice(0, 10),
    })),

  setActiveTimeframe: (activeTimeframe) => set({ activeTimeframe }),

  setAvailableSymbols: (availableSymbols) => {
    const bySymbol = new Map<string, HtxSymbol>();
    [...createFallbackSymbols(), ...availableSymbols].forEach((symbol) => {
      bySymbol.set(symbol.symbol, symbol);
    });
    set({ availableSymbols: Array.from(bySymbol.values()) });
  },

  setConnectionStatus: (connectionStatus) =>
    set({
      connectionStatus,
      isFallbackMode: connectionStatus === "fallback",
      dataSource: connectionStatus === "live" ? get().dataSource : get().dataSource,
    }),

  setSymbolStatus: (symbol, status) =>
    set((state) => ({
      symbolStatuses: {
        ...state.symbolStatuses,
        [symbol]: {
          status: "loading",
          dataSource: "htx_rest_fallback",
          lastUpdated: null,
          latencyMs: null,
          error: null,
          ...state.symbolStatuses[symbol],
          ...status,
        },
      },
    })),

  setError: (error) => set({ error }),

  applyTopTicker: (ticker, status) =>
    set((state) => ({
      topTickers: {
        ...state.topTickers,
        [ticker.symbol]: ticker,
      },
      symbolStatuses: {
        ...state.symbolStatuses,
        [ticker.symbol]: {
          status: ticker.status ?? "disconnected",
          dataSource: ticker.source ?? "backend",
          lastUpdated: Date.now(),
          latencyMs: null,
          error: null,
          ...status,
        },
      },
    })),

  applyTopTickerFallback: (symbol, reason) =>
    set((state) => ({
      symbolStatuses: {
        ...state.symbolStatuses,
        [symbol]: {
          status: "disconnected",
          dataSource: "htx_rest_fallback",
          lastUpdated: Date.now(),
          latencyMs: null,
          error: reason,
        },
      },
    })),

  applySnapshot: (symbol, snapshot) => {
    if (symbol !== get().activeSymbol) {
      return;
    }
    const nextStatus = snapshot.status ?? "disconnected";
    set((state) => {
      const now = Date.now();
      const hasLiveStream = Object.values(state.streamDiagnostics).some((diagnostic) => diagnostic.status === "live");
      const connectionStatus = hasLiveStream ? state.connectionStatus : nextStatus;
      return {
        ticker: snapshot.ticker ?? state.ticker,
        topTickers: snapshot.ticker
          ? {
              ...state.topTickers,
              [symbol]: snapshot.ticker,
            }
          : state.topTickers,
        symbolStatuses: {
          ...state.symbolStatuses,
          [symbol]: {
            status: hasLiveStream ? state.connectionStatus : nextStatus === "mock" ? "mock" : nextStatus,
            dataSource: snapshot.dataSource ?? state.dataSource,
            lastUpdated: now,
            latencyMs: snapshot.latencyMs ?? state.latencyMs,
            error: snapshot.status === "disconnected" ? state.error : null,
          },
        },
        klines: snapshot.klines ? clampKlines(snapshot.klines) : state.klines,
        orderBook: snapshot.orderBook ?? state.orderBook,
        trades: snapshot.trades ? snapshot.trades.slice(0, 100) : state.trades,
        latencyMs: snapshot.latencyMs ?? state.latencyMs,
        dataSource: hasLiveStream ? state.dataSource : snapshot.dataSource ?? state.dataSource,
        connectionStatus,
        lastUpdated: now,
        isFallbackMode: snapshot.isMock ?? false,
        error: snapshot.status === "disconnected" ? state.error : null,
        snapshotVersion: state.snapshotVersion + 1,
        latencyMetrics: {
          ...state.latencyMetrics,
          storeUpdatedAt: now,
        },
      };
    });
  },

  applyTicker: (ticker, meta) => {
    if (ticker.symbol !== get().activeSymbol) {
      return;
    }
    set((state) => {
      const storeUpdatedAt = Date.now();
      const nextStatus = meta?.status ?? ticker.status ?? "disconnected";
      const nextSource = meta?.source ?? ticker.source ?? state.dataSource;
      const current = getCurrentCandle(state, ticker.symbol, state.activeTimeframe);
      const patched = patchCandle(current, state.activeTimeframe, ticker.last, ticker.timestamp);
      const lastKlineUpdate: KlineUpdate = {
        sequence: (state.lastKlineUpdate?.sequence ?? 0) + 1,
        symbol: ticker.symbol,
        timeframe: state.activeTimeframe,
        kline: patched.kline,
        source: "ticker",
        wsReceivedAt: meta?.wsReceivedAt ?? null,
        htxMessageTs: meta?.htxMessageTs ?? null,
        storeUpdatedAt,
        latestTradeTs: state.latencyMetrics.lastTradeTs,
      };
      return {
        ticker,
        topTickers: {
          ...state.topTickers,
          [ticker.symbol]: ticker,
        },
        symbolStatuses: {
          ...state.symbolStatuses,
          [ticker.symbol]: {
            status: nextStatus,
            dataSource: nextSource,
            lastUpdated: storeUpdatedAt,
            latencyMs: meta?.latencyMs ?? state.latencyMs,
            error: null,
          },
        },
        klines: patched.shouldPersistInHistory ? updateKlineArray(state.klines, patched.kline) : state.klines,
        lastKlineUpdate,
        latencyMs: meta?.latencyMs ?? state.latencyMs,
        dataSource: nextSource,
        connectionStatus: nextStatus,
        isFallbackMode: Boolean(meta?.isMock ?? ticker.isMock),
        lastUpdated: storeUpdatedAt,
        error: null,
        latencyMetrics: {
          ...withMessageMetrics(state.latencyMetrics, meta, storeUpdatedAt),
          lastTickerAgeMs: 0,
          lastCandlePatchAt: storeUpdatedAt,
          lastCandlePatchAgeMs: 0,
          lastTradeAgeMs: 0,
          lastTradeToCandlePatchLatencyMs: 0,
        },
      };
    });
  },

  applyKline: (symbol, timeframe, kline, meta) => {
    const state = get();
    if (symbol !== state.activeSymbol || timeframe !== state.activeTimeframe) {
      return;
    }
    set((current) => {
      const storeUpdatedAt = Date.now();
      const nextStatus = meta?.status ?? "disconnected";
      const nextSource = meta?.source ?? current.dataSource;
      return {
        klines: updateKlineArray(current.klines, kline),
        lastKlineUpdate: {
          sequence: (current.lastKlineUpdate?.sequence ?? 0) + 1,
          symbol,
          timeframe,
          kline,
          source: "kline",
          wsReceivedAt: meta?.wsReceivedAt ?? null,
          htxMessageTs: meta?.htxMessageTs ?? null,
          storeUpdatedAt,
          latestTradeTs: current.latencyMetrics.lastTradeTs,
        },
        latencyMs: meta?.latencyMs ?? current.latencyMs,
        symbolStatuses: {
          ...current.symbolStatuses,
          [symbol]: {
            status: nextStatus,
            dataSource: nextSource,
            lastUpdated: storeUpdatedAt,
            latencyMs: meta?.latencyMs ?? current.latencyMs,
            error: null,
          },
        },
        dataSource: nextSource,
        connectionStatus: nextStatus,
        isFallbackMode: Boolean(meta?.isMock),
        lastUpdated: storeUpdatedAt,
        error: null,
        latencyMetrics: {
          ...withMessageMetrics(current.latencyMetrics, meta, storeUpdatedAt),
          lastKlineAgeMs: 0,
          lastCandlePatchAt: storeUpdatedAt,
          lastCandlePatchAgeMs: 0,
          lastTradeAgeMs: 0,
          lastTradeToCandlePatchLatencyMs: 0,
        },
      };
    });
  },

  applyOrderBook: (orderBook, meta) => {
    if (orderBook.symbol !== get().activeSymbol) {
      return;
    }
    set((state) => {
      const storeUpdatedAt = Date.now();
      const nextStatus = meta?.status ?? orderBook.status ?? "disconnected";
      const nextSource = meta?.source ?? orderBook.source ?? state.dataSource;
      const previousOrderBookAt = state.latencyMetrics.lastOrderBookAt;
      const interval = previousOrderBookAt ? Math.max(0, storeUpdatedAt - previousOrderBookAt) : null;
      const nextCount = state.latencyMetrics.orderBookUpdateCount + 1;
      const shouldDepthPatchCandle =
        typeof orderBook.midPrice === "number" &&
        orderBook.midPrice > 0 &&
        (!state.latencyMetrics.lastCandlePatchAt || storeUpdatedAt - state.latencyMetrics.lastCandlePatchAt > 1_000);
      const current = shouldDepthPatchCandle ? getCurrentCandle(state, orderBook.symbol, state.activeTimeframe) : null;
      const patched = shouldDepthPatchCandle
        ? patchCandle(current, state.activeTimeframe, orderBook.midPrice!, orderBook.timestamp)
        : null;
      const lastKlineUpdate = patched
        ? {
            sequence: (state.lastKlineUpdate?.sequence ?? 0) + 1,
            symbol: orderBook.symbol,
            timeframe: state.activeTimeframe,
            kline: patched.kline,
            source: "depth" as CandlePatchSource,
            wsReceivedAt: meta?.wsReceivedAt ?? null,
            htxMessageTs: meta?.htxMessageTs ?? null,
            storeUpdatedAt,
            latestTradeTs: state.latencyMetrics.lastTradeTs,
          }
        : state.lastKlineUpdate;
      return {
        orderBook,
        klines: patched?.shouldPersistInHistory ? updateKlineArray(state.klines, patched.kline) : state.klines,
        lastKlineUpdate,
        symbolStatuses: {
          ...state.symbolStatuses,
          [orderBook.symbol]: {
            status: nextStatus,
            dataSource: nextSource,
            lastUpdated: storeUpdatedAt,
            latencyMs: meta?.latencyMs ?? state.latencyMs,
            error: null,
          },
        },
        latencyMs: meta?.latencyMs ?? state.latencyMs,
        dataSource: nextSource,
        connectionStatus: nextStatus,
        isFallbackMode: Boolean(meta?.isMock ?? orderBook.isMock),
        lastUpdated: storeUpdatedAt,
        error: null,
        latencyMetrics: {
          ...withMessageMetrics(state.latencyMetrics, meta, storeUpdatedAt),
          lastDepthAgeMs: 0,
          lastOrderBookAt: storeUpdatedAt,
          lastOrderBookAgeMs: 0,
          lastCandlePatchAt: patched ? storeUpdatedAt : state.latencyMetrics.lastCandlePatchAt,
          lastCandlePatchAgeMs: patched ? 0 : state.latencyMetrics.lastCandlePatchAgeMs,
          lastTradeAgeMs: patched ? 0 : state.latencyMetrics.lastTradeAgeMs,
          lastTradeToCandlePatchLatencyMs: patched ? 0 : state.latencyMetrics.lastTradeToCandlePatchLatencyMs,
          orderBookUpdateIntervalMs: interval,
          orderBookUpdateIntervalAvgMs: interval === null
            ? state.latencyMetrics.orderBookUpdateIntervalAvgMs
            : updateIntervalAverage(
                state.latencyMetrics.orderBookUpdateIntervalAvgMs,
                state.latencyMetrics.orderBookUpdateCount,
                interval,
              ),
          orderBookUpdateIntervalMaxMs: interval === null
            ? state.latencyMetrics.orderBookUpdateIntervalMaxMs
            : Math.max(state.latencyMetrics.orderBookUpdateIntervalMaxMs ?? 0, interval),
          orderBookUpdateCount: nextCount,
        },
      };
    });
  },

  applyTrades: (symbol, trades, meta) => {
    if (symbol !== get().activeSymbol || trades.length === 0) {
      return;
    }
    set((state) => {
      const storeUpdatedAt = Date.now();
      const nextStatus = meta?.status ?? "disconnected";
      const nextSource = meta?.source ?? state.dataSource;
      const sortedTrades = [...trades].sort((left, right) => left.timestamp - right.timestamp);
      const newestTrades = [...trades].sort((left, right) => right.timestamp - left.timestamp);
      let current = getCurrentCandle(state, symbol, state.activeTimeframe);
      let shouldPersistInHistory = false;
      sortedTrades.forEach((trade) => {
        const patched = patchCandle(current, state.activeTimeframe, trade.price, trade.timestamp, trade.amount);
        current = patched.kline;
        shouldPersistInHistory = shouldPersistInHistory || patched.shouldPersistInHistory;
      });
      const lastKlineUpdate: KlineUpdate = {
        sequence: (state.lastKlineUpdate?.sequence ?? 0) + 1,
        symbol,
        timeframe: state.activeTimeframe,
        kline: current!,
        source: "trade",
        wsReceivedAt: meta?.wsReceivedAt ?? null,
        htxMessageTs: meta?.htxMessageTs ?? null,
        storeUpdatedAt,
        latestTradeTs: storeUpdatedAt,
      };
      return {
        trades: Array.from(new Map([...newestTrades, ...state.trades].map((trade) => [trade.id, trade])).values()).slice(0, 100),
        klines: shouldPersistInHistory ? updateKlineArray(state.klines, current!) : state.klines,
        lastKlineUpdate,
        symbolStatuses: {
          ...state.symbolStatuses,
          [symbol]: {
            status: nextStatus,
            dataSource: nextSource,
            lastUpdated: storeUpdatedAt,
            latencyMs: meta?.latencyMs ?? state.latencyMs,
            error: null,
          },
        },
        latencyMs: meta?.latencyMs ?? state.latencyMs,
        dataSource: nextSource,
        connectionStatus: nextStatus,
        isFallbackMode: Boolean(meta?.isMock),
        lastUpdated: storeUpdatedAt,
        error: null,
        latencyMetrics: {
          ...withMessageMetrics(state.latencyMetrics, meta, storeUpdatedAt),
          lastTradeTs: storeUpdatedAt,
          lastTradeAgeMs: 0,
          lastCandlePatchAt: storeUpdatedAt,
          lastCandlePatchAgeMs: 0,
          lastTradeToCandlePatchLatencyMs: 0,
        },
      };
    });
  },

  recordChartUpdate: (update) =>
    set((state) => {
      const chartUpdatedAt = Date.now();
      const previousChartUpdatedAt = state.latencyMetrics.chartUpdatedAt;
      const interval = previousChartUpdatedAt ? Math.max(0, chartUpdatedAt - previousChartUpdatedAt) : null;
      const nextCount = state.latencyMetrics.chartUpdateCount + 1;
      const streamDiagnostics: Record<StreamName, StreamDiagnostic> = {
        ...state.streamDiagnostics,
        chartPatch: {
          ...state.streamDiagnostics.chartPatch,
          status: "live",
          lastMessageAt: chartUpdatedAt,
          lastMessageAgeMs: 0,
          messageCount: state.streamDiagnostics.chartPatch.messageCount + 1,
          lastParseError: null,
          subscribedTopic: "chart.updateData",
          isStale: false,
        },
      };
      return {
        streamDiagnostics,
        latencyMetrics: {
          ...state.latencyMetrics,
          wsReceivedAt: update.wsReceivedAt,
          htxMessageTs: update.htxMessageTs,
          storeUpdatedAt: update.storeUpdatedAt,
          chartUpdatedAt,
          wsToStoreLatencyMs: update.wsReceivedAt ? Math.max(0, update.storeUpdatedAt - update.wsReceivedAt) : null,
          storeToChartLatencyMs: Math.max(0, chartUpdatedAt - update.storeUpdatedAt),
          totalRenderLatencyMs: update.htxMessageTs
            ? Math.max(0, chartUpdatedAt - update.htxMessageTs)
            : update.wsReceivedAt
              ? Math.max(0, chartUpdatedAt - update.wsReceivedAt)
              : null,
          lastTradeAgeMs: update.latestTradeTs ? Math.max(0, chartUpdatedAt - update.latestTradeTs) : state.latencyMetrics.lastTradeAgeMs,
          lastCandlePatchAgeMs: Math.max(0, chartUpdatedAt - update.storeUpdatedAt),
          lastCandlePatchAt: update.storeUpdatedAt,
          chartUpdateIntervalMs: interval,
          chartUpdateIntervalAvgMs: interval === null
            ? state.latencyMetrics.chartUpdateIntervalAvgMs
            : updateIntervalAverage(
                state.latencyMetrics.chartUpdateIntervalAvgMs,
                state.latencyMetrics.chartUpdateCount,
                interval,
              ),
          chartUpdateIntervalMaxMs: interval === null
            ? state.latencyMetrics.chartUpdateIntervalMaxMs
            : Math.max(state.latencyMetrics.chartUpdateIntervalMaxMs ?? 0, interval),
          chartUpdateCount: nextCount,
        },
        connectionStatus: marketStatusFromDiagnostics(streamDiagnostics, state.isFallbackMode),
      };
    }),

  recordStaleTopicDrop: (meta) =>
    set((state) => {
      const storeUpdatedAt = Date.now();
      return {
        latencyMetrics: {
          ...withMessageMetrics(state.latencyMetrics, meta, storeUpdatedAt),
          staleTopicDrops: state.latencyMetrics.staleTopicDrops + 1,
        },
      };
    }),

  recordStreamMessage: (stream, topic, meta) =>
    set((state) => {
      const now = Date.now();
      const streamDiagnostics = {
        ...state.streamDiagnostics,
        [stream]: {
          ...state.streamDiagnostics[stream],
          status: meta?.status === "live" ? "live" : "fallback",
          lastMessageAt: now,
          lastMessageAgeMs: 0,
          messageCount: state.streamDiagnostics[stream].messageCount + 1,
          lastParseError: null,
          subscribedTopic: topic ?? state.streamDiagnostics[stream].subscribedTopic,
          isStale: false,
        },
      };
      return {
        streamDiagnostics,
        latencyMetrics: {
          ...withMessageMetrics(state.latencyMetrics, meta, now),
          lastTickerAgeMs: stream === "ticker" ? 0 : state.latencyMetrics.lastTickerAgeMs,
          lastKlineAgeMs: stream === "kline" ? 0 : state.latencyMetrics.lastKlineAgeMs,
          lastDepthAgeMs: stream === "depth" ? 0 : state.latencyMetrics.lastDepthAgeMs,
        },
        connectionStatus: marketStatusFromDiagnostics(streamDiagnostics, state.isFallbackMode),
      };
    }),

  recordStreamDegraded: (stream, error, topic) =>
    set((state) => {
      const streamDiagnostics = {
        ...state.streamDiagnostics,
        [stream]: {
          ...state.streamDiagnostics[stream],
          status: "degraded" as const,
          lastParseError: error,
          subscribedTopic: topic ?? state.streamDiagnostics[stream].subscribedTopic,
          isStale: true,
        },
      };
      return {
        streamDiagnostics,
        connectionStatus: marketStatusFromDiagnostics(streamDiagnostics, state.isFallbackMode),
      };
    }),

  recordStreamError: (stream, error, topic) =>
    set((state) => ({
      streamDiagnostics: {
        ...state.streamDiagnostics,
        [stream]: {
          ...state.streamDiagnostics[stream],
          status: "error",
          lastParseError: error,
          subscribedTopic: topic ?? state.streamDiagnostics[stream].subscribedTopic,
          isStale: true,
        },
      },
      connectionStatus: "error",
      error,
    })),

  setActiveSubscriptions: (subscriptions) =>
    set((state) => {
      const nextDiagnostics = { ...state.streamDiagnostics };
      (Object.entries({
        ticker: subscriptions.ticker,
        kline: subscriptions.kline,
        trade: subscriptions.trade,
        depth: subscriptions.depth,
      }) as Array<[StreamName, string | undefined]>).forEach(([stream, topic]) => {
        nextDiagnostics[stream] = {
          ...nextDiagnostics[stream],
          subscribedTopic: topic ?? null,
          lastParseError: null,
        };
      });
      return {
        activeSubscriptions: subscriptions,
        subscribedTopics: Object.values(subscriptions),
        streamDiagnostics: nextDiagnostics,
      };
    }),

  recordReconnect: () => set((state) => ({ reconnectCount: state.reconnectCount + 1 })),

  refreshLatencyAges: () =>
    set((state) => {
      const now = Date.now();
      const streamDiagnostics = refreshDiagnostics(state.streamDiagnostics, now);
      const lastTickerAt = streamDiagnostics.ticker.lastMessageAt;
      const lastKlineAt = streamDiagnostics.kline.lastMessageAt;
      const lastTradeAt = streamDiagnostics.trade.lastMessageAt;
      const lastDepthAt = streamDiagnostics.depth.lastMessageAt;
      const lastCandlePatchAt = state.latencyMetrics.lastCandlePatchAt;
      const tickerFallbackAge = lastTickerAt ? Math.max(0, now - lastTickerAt) : null;
      const tradeAge = lastTradeAt ? Math.max(0, now - lastTradeAt) : state.latencyMetrics.lastTradeAgeMs;
      const candlePatchAge = lastCandlePatchAt ? Math.max(0, now - lastCandlePatchAt) : state.latencyMetrics.lastCandlePatchAgeMs;
      const effectiveTradeAge = streamDiagnostics.trade.isStale && !streamDiagnostics.ticker.isStale && tickerFallbackAge !== null
        ? tickerFallbackAge
        : streamDiagnostics.trade.isStale && streamDiagnostics.chartPatch.status === "live" && candlePatchAge !== null
          ? candlePatchAge
          : tradeAge;
      return {
        streamDiagnostics,
        connectionStatus: marketStatusFromDiagnostics(streamDiagnostics, state.isFallbackMode),
        latencyMetrics: {
          ...state.latencyMetrics,
          lastTickerAgeMs: tickerFallbackAge ?? state.latencyMetrics.lastTickerAgeMs,
          lastKlineAgeMs: lastKlineAt ? Math.max(0, now - lastKlineAt) : state.latencyMetrics.lastKlineAgeMs,
          lastTradeAgeMs: effectiveTradeAge,
          lastDepthAgeMs: lastDepthAt ? Math.max(0, now - lastDepthAt) : state.latencyMetrics.lastDepthAgeMs,
          lastOrderBookAgeMs: lastDepthAt ? Math.max(0, now - lastDepthAt) : state.latencyMetrics.lastOrderBookAgeMs,
          lastCandlePatchAgeMs: candlePatchAge,
        },
      };
    }),

  applyFallback: (symbol, reason) => {
    if (symbol !== get().activeSymbol) {
      return;
    }
    set((state) => ({
      symbolStatuses: {
        ...state.symbolStatuses,
        [symbol]: {
          status: "fallback",
          dataSource: "htx_rest_fallback",
          lastUpdated: Date.now(),
          latencyMs: state.latencyMs,
          error: reason,
        },
      },
      connectionStatus: "fallback",
      dataSource: "htx_rest_fallback",
      isFallbackMode: true,
      error: reason,
      streamDiagnostics: Object.fromEntries(
        (Object.entries(state.streamDiagnostics) as Array<[StreamName, StreamDiagnostic]>).map(([stream, diagnostic]) => [
          stream,
          {
            ...diagnostic,
            status: "fallback",
            isStale: true,
            lastParseError: reason,
          },
        ]),
      ) as Record<StreamName, StreamDiagnostic>,
    }));
  },

  clearSymbolData: (symbol) => {
    if (symbol !== get().activeSymbol) {
      return;
    }
    set((state) => ({
      ticker: null,
      klines: [],
      orderBook: null,
      trades: [],
      symbolStatuses: {
        ...state.symbolStatuses,
        [symbol]: {
          status: "loading",
          dataSource: "htx_rest_fallback",
          lastUpdated: Date.now(),
          latencyMs: null,
          error: null,
        },
      },
      connectionStatus: "connecting",
      dataSource: "htx_rest_fallback",
      isFallbackMode: false,
      error: null,
      lastUpdated: Date.now(),
      snapshotVersion: state.snapshotVersion + 1,
      lastKlineUpdate: null,
      latencyMetrics: createLatencyMetrics(),
      streamDiagnostics: createStreamDiagnostics(),
      activeSubscriptions: {},
      subscribedTopics: [],
      reconnectCount: 0,
    }));
  },
}));

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as Window & {
    __OATHFI_MARKET__?: {
      getState: typeof useMarketDataStore.getState;
    };
  }).__OATHFI_MARKET__ = {
    getState: useMarketDataStore.getState,
  };
}
