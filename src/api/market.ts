import { apiRequest } from "./client";
import type {
  ConnectionStatus,
  HtxSymbol,
  HtxTimeframe,
  MarketKline,
  MarketOrderBook,
  MarketTicker,
  MarketTrade,
  OrderBookLevel,
} from "../services/htx/htxTypes";

type BackendMeta = {
  source: string;
  status: string;
  updated_at: string;
  is_mock: boolean;
};

type BackendTicker = BackendMeta & {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  open_24h?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  volume_base_24h?: number | null;
  funding_rate?: number | null;
  funding_rate_label?: string | null;
  latency_ms?: number | null;
};

type BackendOrderBookLevel = {
  price: number;
  size: number;
  total: number;
};

type BackendOrderBook = BackendMeta & {
  symbol: string;
  bids: BackendOrderBookLevel[];
  asks: BackendOrderBookLevel[];
  spread: number;
  mid_price: number;
  imbalance: number;
  liquidity_score?: number;
  latency_ms?: number | null;
};

type BackendKlinePatch = BackendMeta & {
  symbol: string;
  timeframe: HtxTimeframe;
  kline: MarketKline;
};

type BackendKlines = BackendMeta & {
  symbol: string;
  timeframe: HtxTimeframe;
  klines: MarketKline[];
  latency_ms?: number | null;
};

type BackendTrades = BackendMeta & {
  symbol: string;
  trades: MarketTrade[];
  latency_ms?: number | null;
};

export type MarketSymbolRegistryItem = HtxSymbol & {
  displayName: string;
  searchText: string;
  valuePrecision: number;
  minOrderAmount: string;
  maxOrderAmount: string;
};

export type MarketSymbolRegistry = {
  exchange: "htx";
  symbols: MarketSymbolRegistryItem[];
  source: string;
  updatedAt: number;
};

export type CachedTicker = {
  symbol: string;
  htxSymbol: string;
  last: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  timestamp: number;
  updatedAt: string;
  source: string;
};

export type CachedTickers = {
  exchange: "htx";
  tickers: CachedTicker[];
  source: string;
  updatedAt: number;
};

export type MarketIndicators = BackendMeta & {
  symbol: string;
  timeframe: HtxTimeframe;
  ma20?: number | null;
  ma50?: number | null;
  ma200?: number | null;
  rsi14?: number | null;
  volume?: number | null;
  volume_average_20?: number | null;
};

export type MarketEvent = BackendMeta & {
  id: string;
  workflow_id?: string | null;
  symbol: string;
  title: string;
  summary: string;
  event_type: string;
  severity: number;
  detected_at?: string | null;
  created_at: string;
};

export type BackendMarketMessage =
  | { type: "ticker"; symbol: string; stream?: "ticker"; topic?: string; data: BackendTicker }
  | { type: "kline"; symbol: string; timeframe: HtxTimeframe; stream?: "kline"; topic?: string; data: BackendKlinePatch }
  | { type: "orderbook"; symbol: string; stream?: "depth"; topic?: string; data: BackendOrderBook }
  | { type: "trades"; symbol: string; stream?: "trade"; topic?: string; data: BackendTrades }
  | { type: "subscription_status"; symbol: string; timeframe: HtxTimeframe; data: { active_symbol: string; active_timeframe: HtxTimeframe; subscribed_topics: Record<string, string>; updated_at: string } }
  | { type: "stale_topic"; symbol: string; timeframe?: HtxTimeframe; stream?: string; topic?: string; data: { updated_at: string } }
  | { type: "source_status"; symbol: string; data: unknown };

export const DEFAULT_BACKEND_SYMBOLS: HtxSymbol[] = ["BTC/USDT", "ETH/USDT", "HTX/USDT"].map((symbol) => {
  const [base, quote] = symbol.split("/");
  return {
    symbol,
    htxSymbol: symbol.replace("/", "").toLowerCase(),
    base,
    quote,
    state: "backend",
    pricePrecision: symbol === "HTX/USDT" ? 10 : symbol === "BTC/USDT" ? 1 : 2,
    amountPrecision: 6,
  };
});

export function marketConnectionStatus(status: string, isMock = false): ConnectionStatus {
  if (isMock || status === "mock") {
    return "disconnected";
  }
  if (status === "stale") {
    return "stale";
  }
  if (status === "degraded") {
    return "degraded";
  }
  if (status === "disconnected") {
    return "disconnected";
  }
  if (status === "fallback") {
    return "fallback";
  }
  if (status === "reconnecting") {
    return "reconnecting";
  }
  if (status === "connecting") {
    return "connecting";
  }
  if (status === "live") {
    return "live";
  }
  return "error";
}

export function marketDataSource(data: BackendMeta) {
  if (data.is_mock) {
    return "unavailable";
  }
  if (data.source === "htx_ws" || data.source === "htx_ws_bbo") {
    return "live_ws_htx";
  }
  if (data.source === "htx_rest") {
    return "htx_rest_fallback";
  }
  return data.source;
}

export function toMarketTicker(data: BackendTicker): MarketTicker {
  const changePct = Number(data.change_24h) || 0;
  const open = typeof data.open_24h === "number" ? data.open_24h : changePct === -100 ? data.price : data.price / (1 + changePct / 100);
  return {
    symbol: data.symbol,
    last: data.price,
    open,
    high: typeof data.high_24h === "number" ? data.high_24h : Math.max(data.price, open),
    low: typeof data.low_24h === "number" ? data.low_24h : Math.min(data.price, open),
    volumeBase: typeof data.volume_base_24h === "number" ? data.volume_base_24h : data.price > 0 ? data.volume_24h / data.price : 0,
    volumeQuote: data.volume_24h,
    change: data.price - open,
    changePct,
    timestamp: new Date(data.updated_at).getTime(),
    source: marketDataSource(data),
    status: marketConnectionStatus(data.status, data.is_mock),
    isMock: data.is_mock,
    updatedAt: data.updated_at,
    fundingRate: data.funding_rate ?? null,
    fundingRateLabel: data.funding_rate_label ?? undefined,
    latencyMs: data.latency_ms ?? undefined,
  };
}

export function cachedTickerToMarketTicker(data: CachedTicker): MarketTicker {
  return {
    symbol: data.symbol,
    last: data.last,
    open: data.open,
    high: data.high,
    low: data.low,
    volumeBase: data.volume,
    volumeQuote: data.quoteVolume,
    bid: data.bid,
    ask: data.ask,
    change: data.change,
    changePct: data.changePercent,
    timestamp: data.timestamp,
    source: data.source,
    status: "degraded",
    isMock: false,
    updatedAt: data.updatedAt,
  };
}

function toOrderBookRows(rows: BackendOrderBookLevel[]): OrderBookLevel[] {
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  return rows.map((row) => ({
    price: row.price,
    amount: row.size,
    total: row.total,
    depth: Math.max(4, Math.min(100, (row.total / maxTotal) * 100)),
  }));
}

export function toMarketOrderBook(data: BackendOrderBook): MarketOrderBook {
  return {
    symbol: data.symbol,
    bids: toOrderBookRows(data.bids),
    asks: toOrderBookRows(data.asks),
    timestamp: new Date(data.updated_at).getTime(),
    spread: data.spread,
    midPrice: data.mid_price,
    imbalance: data.imbalance,
    liquidityScore: data.liquidity_score,
    source: marketDataSource(data),
    status: marketConnectionStatus(data.status, data.is_mock),
    isMock: data.is_mock,
    updatedAt: data.updated_at,
  };
}

export function toMarketKlinePatch(data: BackendKlinePatch) {
  return data.kline;
}

export function toMarketTrades(data: BackendTrades) {
  return data.trades;
}

export function toMarketKlines(data: BackendKlines) {
  return data.klines;
}

export function fetchMarketTicker(symbol: string, signal?: AbortSignal) {
  return apiRequest<BackendTicker>(`/api/market/ticker?symbol=${encodeURIComponent(symbol)}`, { signal });
}

export function fetchMarketSymbols(quote?: string, signal?: AbortSignal) {
  const query = quote ? `?quote=${encodeURIComponent(quote)}` : "";
  return apiRequest<MarketSymbolRegistry>(`/api/market/symbols${query}`, { signal });
}

export function fetchMarketTickers(symbols?: string[], signal?: AbortSignal) {
  const query = symbols && symbols.length > 0
    ? `?symbols=${encodeURIComponent(symbols.join(","))}`
    : "";
  return apiRequest<CachedTickers>(`/api/market/tickers${query}`, { signal });
}

export function fetchMarketKlines(symbol: string, timeframe: HtxTimeframe, limit = 300, signal?: AbortSignal) {
  return apiRequest<BackendKlines>(
    `/api/market/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`,
    { signal },
  );
}

export function fetchMarketOrderBook(symbol: string, depth = 20, signal?: AbortSignal) {
  return apiRequest<BackendOrderBook>(
    `/api/market/orderbook?symbol=${encodeURIComponent(symbol)}&depth=${depth}`,
    { signal },
  );
}

export function fetchMarketTrades(symbol: string, limit = 60, signal?: AbortSignal) {
  return apiRequest<BackendTrades>(
    `/api/market/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    { signal },
  );
}

export function fetchMarketIndicators(symbol: string, timeframe: HtxTimeframe, signal?: AbortSignal) {
  return apiRequest<MarketIndicators>(
    `/api/market/indicators?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
    { signal },
  );
}

export function detectMarketEvents(symbol: string, timeframe: HtxTimeframe, signal?: AbortSignal) {
  return apiRequest<MarketEvent[]>(
    `/api/market/events/detect?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
    { method: "POST", signal },
  );
}

export function fetchMarketEvents(symbol: string, limit = 5, signal?: AbortSignal) {
  return apiRequest<MarketEvent[]>(
    `/api/market/events?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    { signal },
  );
}

export async function fetchMarketSourceStatus(signal?: AbortSignal) {
  return apiRequest<unknown>("/api/market/source-status", { signal });
}
