import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { MarketOrderBook } from "../../services/htx/htxTypes";

type DepthImbalanceBarProps = {
  orderBook: MarketOrderBook | null;
};

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function DepthImbalanceBar({ orderBook }: DepthImbalanceBarProps) {
  const { t } = useTranslation();
  const metrics = useMemo(() => {
    const bids = orderBook?.bids ?? [];
    const asks = orderBook?.asks ?? [];
    const bidTotal = bids.reduce((sum, row) => sum + row.amount, 0);
    const askTotal = asks.reduce((sum, row) => sum + row.amount, 0);
    const total = bidTotal + askTotal;
    const imbalance = total > 0 ? (bidTotal - askTotal) / total : orderBook?.imbalance ?? 0;
    const bidPct = total > 0 ? (bidTotal / total) * 100 : 50;
    return {
      imbalance,
      bidPct,
      askPct: 100 - bidPct,
      liquidityScore: orderBook?.liquidityScore ?? Math.min(100, total),
    };
  }, [orderBook]);

  return (
    <div className="depth-imbalance" aria-label={t("marketLive.orderBook.imbalance")}>
      <div className="depth-imbalance__header">
        <span>{t("marketLive.orderBook.imbalance")}</span>
        <StatusPill variant={metrics.imbalance >= 0 ? "success" : "danger"}>{formatPct(metrics.imbalance)}</StatusPill>
      </div>
      <div className="depth-imbalance__bar">
        <i className="depth-imbalance__bid" style={{ width: `${metrics.bidPct}%` }} />
        <i className="depth-imbalance__ask" style={{ width: `${metrics.askPct}%` }} />
      </div>
      <div className="depth-imbalance__meta">
        <span>Bid {metrics.bidPct.toFixed(0)}%</span>
        <span>{t("marketLive.orderBook.liquidityScore")}: {metrics.liquidityScore.toFixed(1)}</span>
        <span>Ask {metrics.askPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

