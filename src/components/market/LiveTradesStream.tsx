import { memo } from "react";
import { useTranslation } from "react-i18next";
import { markRender } from "../../lib/perfDiagnostics";
import { useMarketDataStore } from "../../stores/marketDataStore";

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value > 100 ? 2 : 8 }).format(value);
}

export const LiveTradesStream = memo(function LiveTradesStream() {
  markRender("LiveTradesStream");
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const trades = useMarketDataStore((state) => state.trades);
  const latestTrades = trades.filter((trade) => trade.symbol === activeSymbol).slice(0, 100);

  return (
    <section className="market-side-panel trades-panel" aria-labelledby="trades-title">
      <div className="market-panel-heading market-panel-heading--compact">
        <div>
          <span>{t("marketLive.sections.tradesStream")}</span>
          <h2 id="trades-title">{t("marketLive.trades.title")}</h2>
        </div>
      </div>
      <div className="market-table market-table--trades">
        <div className="market-table__header">
          <span>{t("tables.time")}</span>
          <span>{t("tables.price")}</span>
          <span>{t("tables.size")}</span>
          <span>{t("tables.side")}</span>
        </div>
        {latestTrades.length === 0 ? (
          <div className="trade-empty-state">{t("marketLive.trades.emptyLarge")}</div>
        ) : null}
        {latestTrades.map((trade) => (
          <div className={`trade-row trade-row--${trade.side}`} key={trade.id}>
            <time>{formatTime(trade.timestamp)}</time>
            <span>{formatNumber(trade.price)}</span>
            <span>{formatNumber(trade.amount)}</span>
            <span>{trade.side}</span>
          </div>
        ))}
      </div>
    </section>
  );
});
