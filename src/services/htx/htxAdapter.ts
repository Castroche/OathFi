import type {
  HtxDepthRaw,
  HtxKlineRaw,
  HtxSymbol,
  HtxSymbolRaw,
  HtxTickerRaw,
  HtxTradeBatchRaw,
  HtxTradeItemRaw,
  MarketKline,
  MarketOrderBook,
  MarketTicker,
  MarketTrade,
  OrderBookLevel,
} from "./htxTypes";

export function toHtxSymbol(symbol: string) {
  return symbol.replace("/", "").replace("-", "").toLowerCase();
}

export function toDisplaySymbol(htxSymbol: string, base?: string, quote?: string) {
  if (base && quote) {
    return `${base.toUpperCase()}/${quote.toUpperCase()}`;
  }

  const commonQuotes = ["usdt", "usdc", "btc", "eth", "htx", "trx"];
  const lower = htxSymbol.toLowerCase();
  const quoteToken = commonQuotes.find((quoteCandidate) => lower.endsWith(quoteCandidate));

  if (!quoteToken) {
    return htxSymbol.toUpperCase();
  }

  return `${lower.slice(0, -quoteToken.length).toUpperCase()}/${quoteToken.toUpperCase()}`;
}

export function normalizeSymbols(rawSymbols: HtxSymbolRaw[]) {
  const normalized = rawSymbols
    .filter((symbol) => symbol.state === "online")
    .map<HtxSymbol>((symbol) => ({
      symbol: toDisplaySymbol(symbol.symbol, symbol["base-currency"], symbol["quote-currency"]),
      htxSymbol: symbol.symbol.toLowerCase(),
      base: symbol["base-currency"].toUpperCase(),
      quote: symbol["quote-currency"].toUpperCase(),
      state: symbol.state,
      pricePrecision: symbol["price-precision"] ?? 8,
      amountPrecision: symbol["amount-precision"] ?? 6,
    }))
    .sort((left, right) => {
      if (left.quote !== right.quote) {
        return left.quote === "USDT" ? -1 : right.quote === "USDT" ? 1 : left.quote.localeCompare(right.quote);
      }
      return left.symbol.localeCompare(right.symbol);
    });

  return normalized;
}

export function normalizeTicker(symbol: string, raw: HtxTickerRaw, timestamp = Date.now()): MarketTicker {
  const open = Number(raw.open) || Number(raw.close) || 0;
  const last = Number(raw.close) || open;
  const change = last - open;
  const changePct = open > 0 ? (change / open) * 100 : 0;

  return {
    symbol,
    last,
    open,
    high: Number(raw.high) || last,
    low: Number(raw.low) || last,
    volumeBase: Number(raw.amount) || 0,
    volumeQuote: Number(raw.vol) || 0,
    bid: raw.bid?.[0],
    bidSize: raw.bid?.[1],
    ask: raw.ask?.[0],
    askSize: raw.ask?.[1],
    change,
    changePct,
    timestamp,
  };
}

export function normalizeKlines(rawKlines: HtxKlineRaw[]) {
  return [...rawKlines]
    .sort((left, right) => left.id - right.id)
    .map<MarketKline>((candle) => ({
      timestamp: candle.id * 1000,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.amount) || 0,
      turnover: Number(candle.vol) || 0,
    }));
}

function normalizeSide(levels: Array<[number, number]>, limit: number): OrderBookLevel[] {
  let runningTotal = 0;
  const rows = levels.slice(0, limit).map<OrderBookLevel>((level) => {
    runningTotal += Number(level[1]) || 0;
    return {
      price: Number(level[0]) || 0,
      amount: Number(level[1]) || 0,
      total: runningTotal,
      depth: 0,
    };
  });
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  return rows.map((row) => ({
    ...row,
    depth: Math.max(4, Math.min(100, (row.total / maxTotal) * 100)),
  }));
}

export function normalizeOrderBook(symbol: string, raw: HtxDepthRaw, timestamp = Date.now(), limit = 12): MarketOrderBook {
  return {
    symbol,
    bids: normalizeSide(raw.bids ?? [], limit),
    asks: normalizeSide(raw.asks ?? [], limit),
    timestamp: raw.ts ?? timestamp,
  };
}

export function normalizeTradeItems(symbol: string, items: HtxTradeItemRaw[]) {
  return items.map<MarketTrade>((trade) => ({
    id: `${trade.id}-${trade.ts}`,
    symbol,
    timestamp: trade.ts,
    price: Number(trade.price),
    amount: Number(trade.amount),
    side: trade.direction,
  }));
}

export function normalizeTradeBatches(symbol: string, batches: HtxTradeBatchRaw[]) {
  return batches.flatMap((batch) => normalizeTradeItems(symbol, batch.data ?? []));
}
