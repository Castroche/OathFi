import { Activity } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketIndicators } from "../../api/market";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill } from "../common/StatusPill";

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number") {
    return "--";
  }
  return value.toFixed(digits);
}

function formatPrice(value: number | undefined | null) {
  if (typeof value !== "number") {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value > 100 ? 2 : 6,
  }).format(value);
}

export function IndicatorPanel() {
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const ticker = useMarketDataStore((state) => state.ticker);
  const orderBook = useMarketDataStore((state) => state.orderBook);

  const indicatorsQuery = useQuery({
    queryKey: ["market-indicators", activeSymbol, activeTimeframe],
    queryFn: ({ signal }) => fetchMarketIndicators(activeSymbol, activeTimeframe, signal),
    refetchInterval: 30_000,
  });

  const depthImbalance = useMemo(() => {
    const bidTotal = orderBook?.bids.reduce((sum, row) => sum + row.amount, 0) ?? 0;
    const askTotal = orderBook?.asks.reduce((sum, row) => sum + row.amount, 0) ?? 0;
    const total = bidTotal + askTotal;
    return total > 0 ? ((bidTotal - askTotal) / total) * 100 : (orderBook?.imbalance ?? 0) * 100;
  }, [orderBook]);

  const data = indicatorsQuery.data;
  const indicatorTiles = [
    {
      label: "MA20",
      value: formatPrice(data?.ma20),
      meta: t("marketLive.indicators.ma20Meta"),
      variant: ticker && data?.ma20 && ticker.last >= data.ma20 ? "success" : "warning",
    },
    {
      label: "MA50",
      value: formatPrice(data?.ma50),
      meta: t("marketLive.indicators.ma50Meta"),
      variant: ticker && data?.ma50 && ticker.last >= data.ma50 ? "success" : "warning",
    },
    {
      label: "MA200",
      value: formatPrice(data?.ma200),
      meta: t("marketLive.indicators.ma200Meta"),
      variant: ticker && data?.ma200 && ticker.last >= data.ma200 ? "success" : "info",
    },
    {
      label: "RSI",
      value: formatNumber(data?.rsi14, 1),
      meta: t("marketLive.indicators.rsiMeta"),
      variant: typeof data?.rsi14 === "number" && (data.rsi14 > 70 || data.rsi14 < 30) ? "warning" : "info",
    },
    {
      label: t("marketLive.indicators.depth"),
      value: `${depthImbalance >= 0 ? "+" : ""}${depthImbalance.toFixed(1)}%`,
      meta: t("marketLive.indicators.depthMeta"),
      variant: depthImbalance >= 0 ? "success" : "danger",
    },
    {
      label: t("marketLive.indicators.timeframe"),
      value: activeTimeframe,
      meta: indicatorsQuery.isError ? t("marketLive.indicators.errorMeta") : t("marketLive.indicators.timeframeMeta"),
      variant: indicatorsQuery.isError ? "danger" : "neutral",
    },
  ] as const;

  return (
    <section className="market-wide-panel indicators-panel" aria-labelledby="indicators-title">
      <div className="market-panel-heading market-panel-heading--compact">
        <div>
          <span>
            <Activity size={15} aria-hidden="true" />
            {t("marketLive.sections.indicators")}
          </span>
          <h2 id="indicators-title">{t("marketLive.indicators.title")}</h2>
        </div>
        <StatusPill variant={indicatorsQuery.isError ? "danger" : indicatorsQuery.isLoading ? "warning" : "success"}>
          {indicatorsQuery.isLoading ? t("marketLive.status.loading") : indicatorsQuery.isError ? t("marketLive.status.error") : data?.source ?? "htx_rest_fallback"}
        </StatusPill>
      </div>
      <div className="indicator-grid">
        {indicatorTiles.map((indicator) => (
          <article className={`indicator-tile indicator-tile--${indicator.variant}`} key={indicator.label}>
            <span>{indicator.label}</span>
            <strong>{indicator.value}</strong>
            <p>{indicator.meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
