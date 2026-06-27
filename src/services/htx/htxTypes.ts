export type HtxTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type ConnectionStatus =
  | "live"
  | "degraded"
  | "stale"
  | "mock"
  | "connecting"
  | "reconnecting"
  | "disconnected"
  | "fallback"
  | "error";

export type MarketDataSource = string;

export type SymbolLiveStatus =
  | "live"
  | "degraded"
  | "stale"
  | "mock"
  | "connecting"
  | "loading"
  | "reconnecting"
  | "disconnected"
  | "fallback"
  | "error";

export type TradeSide = "buy" | "sell";

export type MarketMessageMeta = {
  wsReceivedAt: number;
  htxMessageTs: number | null;
  latencyMs: number;
  source?: MarketDataSource;
  status?: ConnectionStatus;
  isMock?: boolean;
  stream?: StreamName;
  topic?: string;
};

export type CandlePatchSource = "snapshot" | "kline" | "trade" | "ticker" | "depth";

export type StreamName = "ticker" | "kline" | "trade" | "depth" | "chartPatch";

export type StreamStatus = "live" | "degraded" | "stale" | "reconnecting" | "fallback" | "error";

export type StreamDiagnostic = {
  status: StreamStatus;
  lastMessageAt: number | null;
  lastMessageAgeMs: number | null;
  messageCount: number;
  lastParseError: string | null;
  subscribedTopic: string | null;
  isStale: boolean;
};

export type MarketLatencyMetrics = {
  wsReceivedAt: number | null;
  htxMessageTs: number | null;
  storeUpdatedAt: number | null;
  chartUpdatedAt: number | null;
  wsToStoreLatencyMs: number | null;
  storeToChartLatencyMs: number | null;
  totalRenderLatencyMs: number | null;
  lastTradeAgeMs: number | null;
  lastTickerAgeMs: number | null;
  lastKlineAgeMs: number | null;
  lastDepthAgeMs: number | null;
  lastCandlePatchAgeMs: number | null;
  lastOrderBookAgeMs: number | null;
  lastTradeTs: number | null;
  lastCandlePatchAt: number | null;
  lastOrderBookAt: number | null;
  lastTradeToCandlePatchLatencyMs: number | null;
  chartUpdateIntervalMs: number | null;
  chartUpdateIntervalAvgMs: number | null;
  chartUpdateIntervalMaxMs: number | null;
  chartUpdateCount: number;
  orderBookUpdateIntervalMs: number | null;
  orderBookUpdateIntervalAvgMs: number | null;
  orderBookUpdateIntervalMaxMs: number | null;
  orderBookUpdateCount: number;
  staleTopicDrops: number;
};

export type HtxSymbol = {
  symbol: string;
  htxSymbol: string;
  base: string;
  quote: string;
  state: string;
  displayName?: string;
  searchText?: string;
  pricePrecision: number;
  amountPrecision: number;
  valuePrecision?: number;
  minOrderAmount?: string;
  maxOrderAmount?: string;
};

export type MarketTicker = {
  symbol: string;
  last: number;
  open: number;
  high: number;
  low: number;
  volumeBase: number;
  volumeQuote: number;
  bid?: number;
  bidSize?: number;
  ask?: number;
  askSize?: number;
  change: number;
  changePct: number;
  timestamp: number;
  source?: MarketDataSource;
  status?: ConnectionStatus;
  isMock?: boolean;
  updatedAt?: string;
  fundingRate?: number | null;
  fundingRateLabel?: string;
  latencyMs?: number;
};

export type MarketKline = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
};

export type OrderBookLevel = {
  price: number;
  amount: number;
  total: number;
  depth: number;
};

export type MarketOrderBook = {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  spread?: number;
  midPrice?: number;
  imbalance?: number;
  liquidityScore?: number;
  source?: MarketDataSource;
  status?: ConnectionStatus;
  isMock?: boolean;
  updatedAt?: string;
};

export type MarketTrade = {
  id: string;
  symbol: string;
  timestamp: number;
  price: number;
  amount: number;
  side: TradeSide;
};

export type HtxSymbolRaw = {
  symbol: string;
  "base-currency": string;
  "quote-currency": string;
  state: string;
  "price-precision"?: number;
  "amount-precision"?: number;
  "value-precision"?: number;
};

export type HtxKlineRaw = {
  id: number;
  open: number;
  close: number;
  low: number;
  high: number;
  amount: number;
  vol: number;
  count: number;
};

export type HtxTickerRaw = {
  id?: number;
  open: number;
  close: number;
  low: number;
  high: number;
  amount: number;
  vol: number;
  count?: number;
  bid?: [number, number];
  ask?: [number, number];
};

export type HtxDepthRaw = {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  ts?: number;
  version?: number;
};

export type HtxTradeItemRaw = {
  id: number;
  ts: number;
  price: number;
  amount: number;
  direction: TradeSide;
};

export type HtxTradeBatchRaw = {
  id: number;
  ts: number;
  data: HtxTradeItemRaw[];
};

export type HtxWsMessage = {
  ch?: string;
  rep?: string;
  status?: string;
  ts?: number;
  tick?: unknown;
  data?: unknown;
  ping?: number;
  pong?: number;
  subbed?: string;
  unsubbed?: string;
  errMsg?: string;
};

export const HTX_TIMEFRAMES: HtxTimeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

export const HTX_PERIOD_BY_TIMEFRAME: Record<HtxTimeframe, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "1h": "60min",
  "4h": "4hour",
  "1d": "1day",
};

export const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "HTX/USDT"] as const;
