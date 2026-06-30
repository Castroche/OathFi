import { Activity, BarChart3, BookOpen, CalendarClock, CircleDollarSign, Gauge, Layers3, Radio, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentContext } from "../../api/agent";
import { marketEventTitle, signalLabel, sourceLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type MarketContextGridProps = {
  context?: AgentContext;
  isLoading: boolean;
  error?: string | null;
};

function formatNumber(value: unknown, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

export function MarketContextGrid({ context, isLoading, error }: MarketContextGridProps) {
  const { t } = useTranslation();
  const levels = context?.key_levels ?? {};
  const volume = context?.volume ?? {};
  const orderBook = context?.orderbook_summary ?? context?.order_book_summary ?? {};
  const macd = context?.macd ?? {};
  const btcCorrelation = context?.btc_correlation ?? {};
  const fundingRate = context?.funding_rate ?? {};
  const rows = [
    { icon: CircleDollarSign, label: t("agentLab.fields.asset", "Asset"), value: context?.asset ?? "--", meta: context?.symbol ?? "--" },
    { icon: Activity, label: t("agentLab.fields.currentPrice", "Current Price"), value: formatNumber(context?.price ?? context?.current_price), meta: sourceLabel(t, context?.source) },
    { icon: CalendarClock, label: t("agentLab.fields.timeframe", "Timeframe"), value: context?.timeframe ?? "--", meta: statusLabel(t, context?.status) },
    {
      icon: Layers3,
      label: t("agentLab.fields.keyLevels", "Key Levels"),
      value: `${formatNumber(levels.recent_low)} / ${formatNumber(levels.recent_high)}`,
      meta: `MA20 ${formatNumber(levels.ma20)}`,
    },
    {
      icon: BarChart3,
      label: t("agentLab.fields.volume", "Volume"),
      value: formatNumber(context?.volume_24h ?? volume.latest),
      meta: `24h / 20MA x${formatNumber(volume.ratio_to_20ma, 2)}`,
    },
    { icon: Gauge, label: t("agentLab.fields.rsi", "RSI"), value: formatNumber(context?.rsi, 1), meta: "RSI 14" },
    { icon: TrendingUp, label: t("agentLab.fields.macd", "MACD"), value: formatNumber(macd.histogram, 4), meta: signalLabel(t, String(macd.status ?? "--")) },
    {
      icon: BookOpen,
      label: t("agentLab.fields.orderBookSummary", "Order Book Summary"),
      value: t("agentLab.fields.spreadValue", { value: formatNumber(context?.spread ?? orderBook.spread, 4), defaultValue: "Spread {{value}}" }),
      meta: t("agentLab.fields.imbalanceValue", { value: formatPercent(context?.imbalance ?? orderBook.imbalance), defaultValue: "Imbalance {{value}}" }),
    },
    {
      icon: Radio,
      label: t("agentLab.fields.btcCorrelation", "BTC Correlation"),
      value: formatNumber(btcCorrelation.value, 2),
      meta: signalLabel(t, String(btcCorrelation.status ?? btcCorrelation.source ?? "--")),
    },
    {
      icon: Activity,
      label: t("agentLab.fields.fundingRate", "Funding Rate"),
      value: fundingRate.value == null ? signalLabel(t, String(fundingRate.label ?? "planned")) : formatPercent(fundingRate.value),
      meta: fundingRate.value == null ? t("agentLab.fields.htxDerivativesPlanned", "HTX derivatives planned") : statusLabel(t, "connected"),
    },
  ];

  return (
    <section className="agent-panel agent-panel--context" aria-labelledby="agent-market-context">
      <div className="agent-panel__heading">
        <span id="agent-market-context">{t("agentLab.sections.context", "Market Context")}</span>
        <StatusPill variant={error ? "danger" : context ? "success" : "warning"}>
          {isLoading ? t("loadingStates.syncing") : error ? t("marketLive.status.error") : statusLabel(t, context?.status ?? "loading")}
        </StatusPill>
      </div>
      {error ? <div className="action-feedback action-feedback--error">{t("agentLab.feedback.marketDataFailed", { error, defaultValue: "Market data failed: {{error}}" })}</div> : null}
      <div className="market-context-grid">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <article className="market-context-cell" key={row.label}>
              <Icon size={15} aria-hidden="true" />
              <span>{row.label}</span>
              <strong>{isLoading ? "--" : row.value}</strong>
              <p>{isLoading ? t("loadingStates.syncing") : row.meta}</p>
            </article>
          );
        })}
      </div>
      <div className="recent-event-strip">
        <span>{t("agentLab.fields.recentEvents", "Recent Events")}</span>
        {(context?.recent_events ?? []).slice(0, 4).map((event) => (
          <p key={String(event.id)}>{marketEventTitle(t, { event_type: String(event.event_type ?? ""), title: String(event.title ?? ""), symbol: context?.symbol })}</p>
        ))}
        {!isLoading && !context?.recent_events.length ? <p>{t("dashboard.empty.noMarketEvents")}</p> : null}
      </div>
    </section>
  );
}
