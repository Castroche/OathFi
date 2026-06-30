import { ArrowRight, Signal } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sourceLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";
import { useMarketDataStore } from "../../stores/marketDataStore";

type MarketHeaderSummaryProps = {
  onGenerateHypothesis?: () => void;
  isGeneratingHypothesis?: boolean;
};

function formatPrice(value: number | undefined | null, fallback: string, maxDigits = 6) {
  if (typeof value !== "number") {
    return fallback;
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value > 100 ? 2 : 4,
    maximumFractionDigits: value > 100 ? 2 : maxDigits,
  }).format(value);
}

function formatCompact(value: number | undefined | null, fallback: string) {
  if (typeof value !== "number") {
    return fallback;
  }
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function formatTime(timestamp: number | null, fallback: string) {
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
  if (status === "live") return "marketLive.status.live";
  if (status === "degraded") return "marketLive.status.degraded";
  if (status === "stale") return "marketLive.status.stale";
  if (status === "reconnecting") return "marketLive.status.reconnecting";
  if (status === "disconnected") return "marketLive.status.disconnected";
  if (status === "fallback") return "marketLive.status.fallback";
  if (status === "error") return "marketLive.status.error";
  return "marketLive.status.loading";
}

export function MarketHeaderSummary({ onGenerateHypothesis, isGeneratingHypothesis = false }: MarketHeaderSummaryProps) {
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const ticker = useMarketDataStore((state) => state.ticker);
  const orderBook = useMarketDataStore((state) => state.orderBook);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const latencyMs = useMarketDataStore((state) => state.latencyMs);
  const lastUpdated = useMarketDataStore((state) => state.lastUpdated);
  const error = useMarketDataStore((state) => state.error);
  const loading = t("marketLive.status.loading");

  const spread = useMemo(() => {
    const bestBid = orderBook?.bids[0]?.price;
    const bestAsk = orderBook?.asks[0]?.price;
    if (typeof bestBid !== "number" || typeof bestAsk !== "number") {
      return null;
    }
    return bestAsk - bestBid;
  }, [orderBook]);

  const stats = [
    { label: t("marketLive.header.lastPrice"), value: formatPrice(ticker?.last, loading), meta: ticker ? `${ticker.changePct >= 0 ? "+" : ""}${ticker.changePct.toFixed(2)}%` : loading },
    { label: t("marketLive.header.high24h"), value: formatPrice(ticker?.high, loading), meta: "HTX" },
    { label: t("marketLive.header.low24h"), value: formatPrice(ticker?.low, loading), meta: "HTX" },
    { label: t("marketLive.header.volume24h"), value: formatCompact(ticker?.volumeQuote, loading), meta: t("marketLive.header.quoteVolume") },
    { label: t("marketLive.header.fundingRate"), value: typeof ticker?.fundingRate === "number" ? `${(ticker.fundingRate * 100).toFixed(4)}%` : (ticker?.fundingRateLabel ?? t("status.planned")), meta: t("marketLive.header.spotFundingMeta") },
    { label: t("marketLive.header.source"), value: sourceLabel(t, dataSource), meta: statusLabel(t, connectionStatus) },
    { label: t("marketLive.header.latency"), value: `${latencyMs ?? ticker?.latencyMs ?? 0} ms`, meta: formatTime(lastUpdated, loading) },
    { label: t("marketLive.header.spread"), value: formatPrice(spread, loading), meta: orderBook ? `${((orderBook.imbalance ?? 0) * 100).toFixed(1)}%` : t("marketLive.header.bestBidAsk") },
  ];

  return (
    <div className="market-symbol-bar market-symbol-bar--live">
      <div>
        <span className="market-symbol-bar__venue">{t("marketLive.header.venue")}</span>
        <strong>{activeSymbol}</strong>
        <p>
          {t("marketLive.header.streamMeta", {
            source: dataSource,
            updated: formatTime(lastUpdated, loading),
            latency: latencyMs ?? ticker?.latencyMs ?? 0,
          })}
        </p>
        <div className="market-connection-row">
          <StatusPill variant={connectionStatus === "live" ? "success" : connectionStatus === "error" || connectionStatus === "disconnected" ? "danger" : "warning"}>
            <Signal size={13} aria-hidden="true" />
            {t(statusKey(connectionStatus))}
          </StatusPill>
          <StatusPill variant="danger">{t("status.liveTradingDisabled")}</StatusPill>
          <StatusPill variant="info">{t("status.paperTradingOnly")}</StatusPill>
        </div>
        {onGenerateHypothesis ? (
          <button className="primary-action market-generate-action" type="button" disabled={isGeneratingHypothesis} onClick={onGenerateHypothesis}>
            <span>{isGeneratingHypothesis ? t("loadingStates.generating") : t("actions.generateHypothesis")}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : null}
        {error ? <p className="market-error-text">{error}</p> : null}
      </div>
      <div className="market-symbol-bar__stats market-symbol-bar__stats--wide">
        {stats.map((item) => (
          <article className="market-header-stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <em>{item.meta}</em>
          </article>
        ))}
      </div>
    </div>
  );
}
