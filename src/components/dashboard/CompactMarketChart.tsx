import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MarketKline, MarketOrderBook } from "../../services/htx/htxTypes";
import { statusLabel } from "../../lib/displayLabels";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

type CompactMarketChartProps = {
  klines: MarketKline[];
  orderBook: MarketOrderBook | null;
  status: string;
};

function formatNumber(value: number | undefined, maxDigits = 6) {
  if (typeof value !== "number") {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: value > 100 ? 2 : 0,
  }).format(value);
}

function statusVariant(status: string): StatusPillVariant {
  if (status === "live") return "success";
  if (status === "disconnected" || status === "error") return "danger";
  return "warning";
}

export function CompactMarketChart({ klines, orderBook, status }: CompactMarketChartProps) {
  const { t } = useTranslation();
  const closes = klines.slice(-18).map((kline) => kline.close);
  const min = closes.length ? Math.min(...closes) : 0;
  const max = closes.length ? Math.max(...closes) : 0;
  const range = Math.max(max - min, 1);
  const bars = closes.map((close) => 28 + ((close - min) / range) * 72);
  const orderBookRows = [
    ...(orderBook?.asks.slice(0, 4).map((row) => ({ ...row, side: "ask" as const })) ?? []),
    ...(orderBook?.bids.slice(0, 4).map((row) => ({ ...row, side: "bid" as const })) ?? []),
  ];

  return (
    <section className="market-snapshot" aria-labelledby="market-snapshot">
      <div className="section-heading">
        <div className="section-heading__title">
          <BarChart3 size={15} aria-hidden="true" />
          <h2 id="market-snapshot">{t("dashboard.sections.ethOneHour")}</h2>
        </div>
        <StatusPill variant={statusVariant(status)}>{statusLabel(t, status)}</StatusPill>
      </div>
      <div className="mini-chart" aria-label={t("commandCenter.sections.miniChart")}>
        {bars.length > 0 ? (
          bars.map((height, index) => (
            <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
          ))
        ) : (
          <em className="market-snapshot-empty">{t("dashboard.empty.noKline")}</em>
        )}
      </div>
      <div className="order-book-heading">
        <span>{t("marketLive.sections.orderBook")}</span>
        <strong>{orderBook?.spread ? formatNumber(orderBook.spread, 8) : "--"}</strong>
      </div>
      <div className="order-book-snapshot">
        {orderBookRows.map((row) => (
          <div className={`order-book-row order-book-row--${row.side}`} key={`${row.side}-${row.price}`}>
            <span>{formatNumber(row.price, 8)}</span>
            <strong>{formatNumber(row.amount, 6)}</strong>
            <i style={{ width: `${row.depth}%` }} aria-hidden="true" />
          </div>
        ))}
        {orderBookRows.length === 0 ? (
          <div className="market-snapshot-empty">{t("dashboard.empty.noOrderBook")}</div>
        ) : null}
      </div>
    </section>
  );
}
