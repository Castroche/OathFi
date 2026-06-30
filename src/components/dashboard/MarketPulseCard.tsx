import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardMarketPulse } from "../../api/dashboard";
import type { MarketTicker } from "../../services/htx/htxTypes";
import { sourceLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

type MarketPulseCardProps = {
  pulse?: DashboardMarketPulse;
  tickers: Record<string, MarketTicker | undefined>;
  isLoading: boolean;
};

function formatNumber(value: number | undefined, digits = 2) {
  if (typeof value !== "number") {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value > 100 ? 2 : 0,
  }).format(value);
}

function statusVariant(status?: string): StatusPillVariant {
  if (status === "live") return "success";
  if (status === "degraded" || status === "stale" || status === "connecting") return "warning";
  if (status === "disconnected" || status === "error") return "danger";
  return "info";
}

export function MarketPulseCard({ pulse, tickers, isLoading }: MarketPulseCardProps) {
  const { t } = useTranslation();
  const symbols = pulse?.symbols ?? ["BTC/USDT", "ETH/USDT", "HTX/USDT"];
  const liveCount = symbols.filter((symbol) => tickers[symbol]?.status === "live").length;

  return (
    <article className="command-metric command-metric--wide">
      <header>
        <span className="command-metric__icon command-state--success">
          <Activity size={15} aria-hidden="true" />
        </span>
        <h2>{t("panels.marketPulse")}</h2>
        <StatusPill variant={statusVariant(liveCount > 0 ? "live" : pulse?.status)}>
          {liveCount > 0 ? t("marketLive.status.live") : statusLabel(t, pulse?.status ?? "loading")}
        </StatusPill>
      </header>
      <div className="market-pulse-symbols">
        {symbols.map((symbol) => {
          const ticker = tickers[symbol];
          return (
            <div className="market-pulse-symbol" key={symbol}>
              <span>{symbol}</span>
              <strong>{formatNumber(ticker?.last, symbol === "HTX/USDT" ? 10 : 2)}</strong>
              <em className={(ticker?.changePct ?? 0) >= 0 ? "is-up" : "is-down"}>
                {ticker ? `${ticker.changePct >= 0 ? "+" : ""}${ticker.changePct.toFixed(2)}%` : "--"}
              </em>
            </div>
          );
        })}
      </div>
      <p>
        {isLoading
          ? t("loadingStates.syncing")
          : `${sourceLabel(t, pulse?.source ?? "htx_ws")} / ${pulse?.active_events ?? 0} ${t("dashboard.labels.activeEvents")}`}
      </p>
    </article>
  );
}
