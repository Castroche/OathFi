import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { markRender } from "../../lib/perfDiagnostics";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill } from "../common/StatusPill";
import type { MarketOrderBook, OrderBookLevel } from "../../services/htx/htxTypes";
import { DepthImbalanceBar } from "./DepthImbalanceBar";

type PrecisionValue = "auto" | number;

const ORDER_BOOK_PRECISION_PREFIX = "oathfi.order-book.precision.v1";

function formatNumber(value: number, maxDigits = 8, minDigits = value > 100 ? 2 : 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: minDigits,
  }).format(value);
}

function formatTimestamp(timestamp: number | null, fallback: string) {
  if (!timestamp) {
    return fallback;
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function statusKey(status: string) {
  if (status === "stale") return "marketLive.status.stale";
  if (status === "mock") return "marketLive.status.mock";
  if (status === "disconnected") return "marketLive.status.disconnected";
  if (status === "live") return "marketLive.status.live";
  if (status === "degraded") return "marketLive.status.degraded";
  if (status === "fallback") return "marketLive.status.fallback";
  if (status === "reconnecting") return "marketLive.status.reconnecting";
  if (status === "error") return "marketLive.status.error";
  return "marketLive.status.loading";
}

function precisionStorageKey(symbol: string) {
  return `${ORDER_BOOK_PRECISION_PREFIX}.${symbol}`;
}

function getAutoTickSize(symbol: string, fallbackPrecision?: number) {
  if (symbol === "BTC/USDT") return 0.1;
  if (symbol === "ETH/USDT") return 0.01;
  if (symbol === "HTX/USDT") return 0.000000001;
  if (typeof fallbackPrecision === "number" && fallbackPrecision > 0 && fallbackPrecision <= 10) {
    return 10 ** -fallbackPrecision;
  }
  return 0.01;
}

function decimalPlacesForTick(tickSize: number) {
  if (tickSize >= 1) {
    return 0;
  }
  const [, fraction = ""] = tickSize.toFixed(12).replace(/0+$/, "").split(".");
  return fraction.length;
}

function formatTickSize(tickSize: number) {
  return tickSize >= 1 ? tickSize.toFixed(0) : tickSize.toFixed(decimalPlacesForTick(tickSize));
}

function createPrecisionOptions(symbol: string, fallbackPrecision?: number) {
  const baseTickSize = getAutoTickSize(symbol, fallbackPrecision);
  return Array.from(new Set([0, 1, 2, 3].map((offset) => Number((baseTickSize * 10 ** offset).toPrecision(12)))));
}

function getStoredPrecision(symbol: string): PrecisionValue {
  if (typeof window === "undefined") {
    return "auto";
  }
  const stored = window.localStorage.getItem(precisionStorageKey(symbol));
  if (!stored || stored === "auto") {
    return "auto";
  }
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : "auto";
}

function persistPrecision(symbol: string, precision: PrecisionValue) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(precisionStorageKey(symbol), precision === "auto" ? "auto" : String(precision));
}

function aggregateSide(levels: OrderBookLevel[], tickSize: number, side: "bid" | "ask") {
  const buckets = new Map<number, number>();
  levels.forEach((level) => {
    const bucket = side === "bid"
      ? Math.floor(level.price / tickSize) * tickSize
      : Math.ceil(level.price / tickSize) * tickSize;
    const normalizedBucket = Number(bucket.toFixed(12));
    buckets.set(normalizedBucket, (buckets.get(normalizedBucket) ?? 0) + level.amount);
  });
  const sorted = Array.from(buckets.entries())
    .sort(([left], [right]) => (side === "bid" ? right - left : left - right))
    .slice(0, 12);

  let total = 0;
  const rows = sorted.map(([price, amount]) => {
    total += amount;
    return { price, amount, total, depth: 0 };
  });

  if (rows.length > 0) {
    while (rows.length < 12) {
      const previous = rows[rows.length - 1];
      const price = Number((previous.price + (side === "ask" ? tickSize : -tickSize)).toFixed(12));
      if (price <= 0) {
        break;
      }
      rows.push({ price, amount: 0, total, depth: 0 });
    }
  }

  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  return rows.map((row) => ({ ...row, depth: (row.total / maxTotal) * 100 }));
}

function aggregateOrderBook(orderBook: MarketOrderBook | null, selectedTickSize: number | null) {
  if (!orderBook) {
    return null;
  }
  if (!selectedTickSize) {
    return orderBook;
  }
  return {
    ...orderBook,
    bids: aggregateSide(orderBook.bids, selectedTickSize, "bid"),
    asks: aggregateSide(orderBook.asks, selectedTickSize, "ask"),
  };
}

export const LiveOrderBook = memo(function LiveOrderBook() {
  markRender("LiveOrderBook");
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const availableSymbols = useMarketDataStore((state) => state.availableSymbols);
  const orderBook = useMarketDataStore((state) => state.orderBook);
  const ticker = useMarketDataStore((state) => state.ticker);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const lastUpdated = useMarketDataStore((state) => state.lastUpdated);
  const [selectedPrecision, setSelectedPrecision] = useState<PrecisionValue>(() => getStoredPrecision(activeSymbol));

  const symbolPrecision = availableSymbols.find((symbol) => symbol.symbol === activeSymbol)?.pricePrecision;
  const precisionOptions = useMemo(() => createPrecisionOptions(activeSymbol, symbolPrecision), [activeSymbol, symbolPrecision]);
  const autoTickSize = getAutoTickSize(activeSymbol, symbolPrecision);
  const selectedTickSize = selectedPrecision === "auto" ? autoTickSize : selectedPrecision;

  useEffect(() => {
    setSelectedPrecision(getStoredPrecision(activeSymbol));
  }, [activeSymbol]);

  useEffect(() => {
    setSelectedPrecision((current) => {
      if (current === "auto" || precisionOptions.includes(current)) {
        return current;
      }
      return "auto";
    });
  }, [precisionOptions]);

  useEffect(() => {
    persistPrecision(activeSymbol, selectedPrecision);
  }, [activeSymbol, selectedPrecision]);

  const displayOrderBook = useMemo(() => aggregateOrderBook(orderBook, selectedTickSize), [orderBook, selectedTickSize]);
  const priceDigits = selectedTickSize ? decimalPlacesForTick(selectedTickSize) : 8;
  const precisionIndex = selectedPrecision === "auto" ? -1 : precisionOptions.findIndex((option) => option === selectedPrecision);

  const adjustPrecision = useCallback((direction: -1 | 1) => {
    setSelectedPrecision((current) => {
      if (current === "auto") {
        return direction > 0 ? precisionOptions[0] ?? "auto" : precisionOptions[precisionOptions.length - 1] ?? "auto";
      }
      const currentIndex = precisionOptions.findIndex((option) => option === current);
      const nextIndex = Math.max(0, Math.min(precisionOptions.length - 1, currentIndex + direction));
      return precisionOptions[nextIndex] ?? current;
    });
  }, [precisionOptions]);

  const spread = useMemo(() => {
    const bestBid = displayOrderBook?.bids[0]?.price;
    const bestAsk = displayOrderBook?.asks[0]?.price;
    if (typeof bestBid !== "number" || typeof bestAsk !== "number") {
      return t("marketLive.status.loading");
    }
    const midPrice = (bestBid + bestAsk) / 2;
    const absolute = bestAsk - bestBid;
    const pct = midPrice > 0 ? (absolute / midPrice) * 100 : 0;
    return `${formatNumber(absolute, priceDigits)} (${pct.toFixed(4)}%)`;
  }, [displayOrderBook, priceDigits, t]);

  return (
    <section className="market-side-panel order-book-panel" aria-labelledby="order-book-title">
      <div className="market-panel-heading market-panel-heading--compact">
        <div>
          <span>{t("marketLive.sections.orderBook")}</span>
          <h2 id="order-book-title">{t("marketLive.orderBook.title")}</h2>
        </div>
        <StatusPill variant="info">{spread}</StatusPill>
      </div>
      <div className="order-book-source-row">
        <StatusPill variant={connectionStatus === "error" || connectionStatus === "disconnected" ? "danger" : connectionStatus === "live" ? "success" : "warning"}>
          {t(statusKey(connectionStatus))}
        </StatusPill>
        <StatusPill variant={dataSource === "unavailable" ? "danger" : "info"}>
          {dataSource === "unavailable" ? t("marketLive.status.error") : dataSource}
        </StatusPill>
        <span>{formatTimestamp(lastUpdated, t("marketLive.status.loading"))}</span>
      </div>
      <div className="order-book-precision" aria-label={t("marketLive.orderBook.precision")}>
        <span>{t("marketLive.orderBook.precision")}</span>
        <button
          type="button"
          aria-label={t("marketLive.orderBook.decreaseAggregation")}
          title={t("marketLive.orderBook.decreaseAggregation")}
          onClick={() => adjustPrecision(1)}
          disabled={precisionIndex === precisionOptions.length - 1}
        >
          -
        </button>
        <select
          aria-label={t("marketLive.orderBook.precision")}
          value={selectedPrecision === "auto" ? "auto" : String(selectedPrecision)}
          onChange={(event) => setSelectedPrecision(event.target.value === "auto" ? "auto" : Number(event.target.value))}
        >
          <option value="auto">{t("marketLive.orderBook.auto")}</option>
          {precisionOptions.map((option) => (
            <option key={option} value={option}>
              {formatTickSize(option)}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={t("marketLive.orderBook.increaseAggregation")}
          title={t("marketLive.orderBook.increaseAggregation")}
          onClick={() => adjustPrecision(-1)}
          disabled={precisionIndex <= 0 && selectedPrecision !== "auto"}
        >
          +
        </button>
      </div>
      <DepthImbalanceBar orderBook={displayOrderBook} />
      <div className="market-table market-table--order-book">
        <div className="market-table__header">
          <span>{t("tables.price")}</span>
          <span>{t("tables.size")}</span>
          <span>{t("tables.total")}</span>
        </div>
        {[...(displayOrderBook?.asks ?? [])].reverse().map((row) => (
          <div className="order-book-depth order-book-depth--ask" key={`ask-${row.price}`}>
            <i style={{ width: `${row.depth}%` }} aria-hidden="true" />
            <span>{formatNumber(row.price, priceDigits, priceDigits)}</span>
            <span>{formatNumber(row.amount, 6)}</span>
            <span>{formatNumber(row.total, 6)}</span>
          </div>
        ))}
        <div className="order-book-mid">
          <strong>{ticker ? formatNumber(ticker.last, priceDigits, priceDigits) : t("marketLive.status.loading")}</strong>
          <span>{ticker && ticker.changePct >= 0 ? "+" : ""}{ticker ? ticker.changePct.toFixed(2) : "0.00"}%</span>
        </div>
        {(displayOrderBook?.bids ?? []).map((row) => (
          <div className="order-book-depth order-book-depth--bid" key={`bid-${row.price}`}>
            <i style={{ width: `${row.depth}%` }} aria-hidden="true" />
            <span>{formatNumber(row.price, priceDigits, priceDigits)}</span>
            <span>{formatNumber(row.amount, 6)}</span>
            <span>{formatNumber(row.total, 6)}</span>
          </div>
        ))}
      </div>
    </section>
  );
});
