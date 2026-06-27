import type { MarketKline, MarketOrderBook, MarketTicker, MarketTrade } from "../htx/htxTypes";
import type { ExtractedMarketFeatures } from "./decisionTypes";
import { clamp, normalizeUnit } from "./scoreNormalize";

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(klines: MarketKline[], period: number) {
  return average(klines.slice(-period).map((kline) => kline.close));
}

function calculateAtrPercent(klines: MarketKline[], ticker: MarketTicker | null) {
  if (klines.length < 2) {
    if (!ticker || ticker.last <= 0) {
      return 0;
    }
    return ((ticker.high - ticker.low) / ticker.last) * 100;
  }
  const ranges = klines.slice(-14).map((kline) => kline.high - kline.low);
  const latestClose = klines[klines.length - 1]?.close ?? ticker?.last ?? 1;
  return latestClose > 0 ? (average(ranges) / latestClose) * 100 : 0;
}

function calculateSpreadPct(orderBook: MarketOrderBook | null, ticker: MarketTicker | null) {
  const bestBid = orderBook?.bids[0]?.price ?? ticker?.bid;
  const bestAsk = orderBook?.asks[0]?.price ?? ticker?.ask;
  if (typeof bestBid !== "number" || typeof bestAsk !== "number" || bestBid <= 0 || bestAsk <= 0) {
    return 0.08;
  }
  const mid = (bestBid + bestAsk) / 2;
  return mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : 0.08;
}

function calculateDepthImbalance(orderBook: MarketOrderBook | null) {
  const bidTotal = orderBook?.bids.slice(0, 12).reduce((sum, row) => sum + row.amount, 0) ?? 0;
  const askTotal = orderBook?.asks.slice(0, 12).reduce((sum, row) => sum + row.amount, 0) ?? 0;
  const total = bidTotal + askTotal;
  return total > 0 ? (bidTotal - askTotal) / total : 0;
}

function calculateTradeImbalance(trades: MarketTrade[]) {
  const latest = trades.slice(0, 80);
  const buy = latest.filter((trade) => trade.side === "buy").reduce((sum, trade) => sum + trade.amount, 0);
  const sell = latest.filter((trade) => trade.side === "sell").reduce((sum, trade) => sum + trade.amount, 0);
  const total = buy + sell;
  return total > 0 ? (buy - sell) / total : 0;
}

export function extractMarketFeatures({
  symbol,
  ticker,
  klines,
  orderBook,
  trades,
  dataSource,
  connectionStatus,
  lastUpdated,
  latencyMs,
}: {
  symbol: string;
  ticker: MarketTicker | null;
  klines: MarketKline[];
  orderBook: MarketOrderBook | null;
  trades: MarketTrade[];
  dataSource: string;
  connectionStatus: string;
  lastUpdated: number | null;
  latencyMs: number | null;
}): ExtractedMarketFeatures {
  const latest = klines[klines.length - 1];
  const price = ticker?.last ?? latest?.close ?? 0;
  const ma20 = movingAverage(klines, Math.min(20, klines.length));
  const ma50 = movingAverage(klines, Math.min(50, klines.length));
  const changePct = ticker?.changePct ?? (latest && latest.open > 0 ? ((latest.close - latest.open) / latest.open) * 100 : 0);
  const spreadPct = calculateSpreadPct(orderBook, ticker);
  const atrPercent = calculateAtrPercent(klines, ticker);
  const depthImbalance = calculateDepthImbalance(orderBook);
  const tradeImbalance = calculateTradeImbalance(trades);
  const lastVolumes = klines.slice(-20).map((kline) => kline.volume);
  const volumeBase = average(lastVolumes.slice(0, -1));
  const volumeRatio = volumeBase > 0 && latest ? latest.volume / volumeBase : 1;

  const trendRaw = price > ma20 && ma20 >= ma50 ? 82 : price > ma20 ? 68 : price < ma20 && ma20 <= ma50 ? 24 : 42;
  const trendLong = normalizeUnit(trendRaw);
  const trendShort = normalizeUnit(100 - trendRaw);
  const momentumLong = normalizeUnit(50 + changePct * 7 + tradeImbalance * 18);
  const momentumShort = normalizeUnit(50 - changePct * 7 - tradeImbalance * 18);
  const volumeScore = normalizeUnit(45 + Math.min(volumeRatio, 2.8) * 18);
  const liquidityScore = clamp(100 - spreadPct * 190 + Math.abs(depthImbalance) * 12, 0, 100);
  const liquidityLong = normalizeUnit(liquidityScore + depthImbalance * 16);
  const liquidityShort = normalizeUnit(liquidityScore - depthImbalance * 16);
  const volatilityQuality = normalizeUnit(100 - Math.abs(atrPercent - 2.2) * 17);
  const resistanceDistance = ticker && ticker.high > price && price > 0 ? ((ticker.high - price) / price) * 100 : 1.8;
  const supportDistance = ticker && ticker.low < price && price > 0 ? ((price - ticker.low) / price) * 100 : 1.2;
  const riskRewardRatio = clamp(resistanceDistance / Math.max(0.35, supportDistance), 0.4, 4);
  const rrLong = normalizeUnit(riskRewardRatio, 0.8, 3);
  const rrShort = normalizeUnit(1 / Math.max(0.35, riskRewardRatio), 0.35, 1.8);
  const staleMinutes = lastUpdated ? (Date.now() - lastUpdated) / 60_000 : 20;
  const isMockSource = connectionStatus === "mock";
  const dataQuality = clamp(
    (connectionStatus === "live" ? 0.34 : connectionStatus === "stale" ? 0.18 : 0.12) +
      (isMockSource ? 0.1 : dataSource.includes("htx") ? 0.24 : 0.18) +
      (klines.length >= 80 ? 0.16 : klines.length >= 20 ? 0.1 : 0.04) +
      (orderBook ? 0.12 : 0) +
      (trades.length > 20 ? 0.08 : 0.03) +
      (staleMinutes < 2 ? 0.04 : 0) -
      (latencyMs && latencyMs > 3500 ? 0.08 : 0),
    0,
    1,
  );

  const directionalConflict = Math.abs(trendLong - momentumLong);
  const flowConflict = Math.abs(depthImbalance - tradeImbalance);
  const signalConflict = clamp(directionalConflict * 0.55 + flowConflict * 0.45, 0, 1);

  const marketRegime =
    atrPercent > 5
      ? "volatility-expansion"
      : liquidityScore < 42
        ? "liquidity-thin"
        : price > ma20 && changePct > 0.25
          ? "breakout-attempt"
          : price > ma20
            ? "pullback-watch"
            : changePct < -1.2
              ? "risk-off"
              : "range-bound";

  const evidence = [
    price && ma20 ? `${symbol} price ${price >= ma20 ? "above" : "below"} MA20 proxy` : "Market price snapshot available",
    `Visible spread ${spreadPct.toFixed(3)}%`,
    `Depth imbalance ${(depthImbalance * 100).toFixed(1)}%`,
    `Recent trade-flow imbalance ${(tradeImbalance * 100).toFixed(1)}%`,
  ];
  const warnings = [
    atrPercent > 4.8 ? "ATR expansion requires guarded sizing" : "",
    spreadPct > 0.2 ? "Spread is widening versus normal threshold" : "",
    dataQuality < 0.62 ? "Data reliability is below optimal level" : "",
    signalConflict > 0.55 ? "Directional signals are conflicting" : "",
  ].filter(Boolean);

  return {
    symbol,
    long: {
      trend: trendLong,
      momentum: momentumLong,
      volume: volumeScore,
      liquidity: liquidityLong,
      volatilityQuality,
      riskReward: rrLong,
    },
    short: {
      trend: trendShort,
      momentum: momentumShort,
      volume: volumeScore,
      liquidity: liquidityShort,
      volatilityQuality,
      riskReward: rrShort,
    },
    spreadPct,
    atrPercent,
    liquidityScore,
    dataQuality,
    signalConflict,
    riskRewardRatio,
    marketRegime,
    currentSetup:
      marketRegime === "breakout-attempt"
        ? "Breakout attempt with live market confirmation"
        : marketRegime === "pullback-watch"
          ? "Pullback watch with conditional continuation"
          : marketRegime === "liquidity-thin"
            ? "Thin liquidity watch"
            : marketRegime === "risk-off"
              ? "Risk-off market context"
              : marketRegime === "volatility-expansion"
                ? "Volatility expansion guard"
                : "Range-bound observation",
    nextConfirmation:
      marketRegime === "breakout-attempt"
        ? "1m candle close above resistance with stable spread"
        : marketRegime === "pullback-watch"
          ? "Retest holds while bid depth remains positive"
          : "Wait for cleaner structure and lower signal conflict",
    evidence,
    warnings,
  };
}
