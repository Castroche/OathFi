import { Activity, BarChart3, LineChart, Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { Backtest } from "../../api/backtests";

type BacktestStudioContentProps = {
  backtest?: Backtest;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function BacktestStudioContent({ backtest }: BacktestStudioContentProps) {
  const { t } = useTranslation();

  if (!backtest) {
    return (
      <section className="backtest-studio" aria-label={t("backtestStudio.aria")}>
        <div className="backtest-brief">
          <div>
            <span className="backtest-brief__eyebrow">{t("backtestStudio.sections.validationTicket")}</span>
            <h2>Disconnected</h2>
            <p>Historical backtest data is not connected. No simulated backtest is shown.</p>
          </div>
          <StatusPill variant="warning">disconnected</StatusPill>
        </div>
      </section>
    );
  }

  return (
    <section className="backtest-studio" aria-label={t("backtestStudio.aria")}>
      <div className="backtest-brief">
        <div>
          <span className="backtest-brief__eyebrow">{t("backtestStudio.sections.validationTicket")}</span>
          <h2>{backtest.id}</h2>
          <p>{backtest.sample_period}</p>
        </div>
        <div className="backtest-brief__meta" aria-label={t("backtestStudio.sections.briefMeta")}>
          <span>{backtest.data_source}</span>
          <span>{backtest.methodology}</span>
          <StatusPill variant={backtest.is_mock ? "danger" : "success"}>{backtest.is_mock ? "mock" : "real"}</StatusPill>
        </div>
      </div>

      <div className="backtest-metrics" aria-label={t("backtestStudio.sections.metrics")}>
        {[
          { id: "win-rate", icon: Activity, label: "win_rate", value: formatPercent(backtest.win_rate), meta: backtest.sample_quality },
          { id: "profit-factor", icon: BarChart3, label: "profit_factor", value: backtest.profit_factor.toFixed(2), meta: backtest.source },
          { id: "drawdown", icon: LineChart, label: "max_drawdown", value: formatPercent(backtest.max_drawdown), meta: `avg_rr ${backtest.avg_rr.toFixed(2)}` },
          { id: "trades", icon: Table2, label: "trade_count", value: String(backtest.trade_count), meta: backtest.status },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="backtest-metric backtest-metric--info" key={metric.id}>
              <header>
                <span className="command-state--info">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <h3>{metric.label}</h3>
              </header>
              <strong>{metric.value}</strong>
              <p>{metric.meta}</p>
            </article>
          );
        })}
      </div>

      <section className="backtest-panel" aria-labelledby="backend-backtest-title">
        <div className="backtest-panel__heading">
          <span>
            <Table2 size={15} aria-hidden="true" />
            Backend trades
          </span>
          <StatusPill variant={backtest.trades.length > 0 ? "success" : "warning"}>
            {backtest.trades.length > 0 ? "connected" : "empty"}
          </StatusPill>
        </div>
        <h2 id="backend-backtest-title">{backtest.status}</h2>
        <div className="backtest-trade-table">
          <div className="backtest-trade-table__header">
            <span>time</span>
            <span>side</span>
            <span>entry</span>
            <span>exit</span>
            <span>pnl</span>
            <span>rr</span>
            <span>status</span>
          </div>
          {backtest.trades.slice(0, 12).map((trade, index) => (
            <article className="backtest-trade-row" key={`${String(trade.time)}-${index}`}>
              <time>{String(trade.time ?? "--")}</time>
              <span>{String(trade.side ?? "--")}</span>
              <span>{String(trade.entry ?? "--")}</span>
              <span>{String(trade.exit ?? "--")}</span>
              <strong>{String(trade.pnl ?? "--")}</strong>
              <span>{String(trade.rr ?? "--")}</span>
              <StatusPill variant={trade.status === "win" ? "success" : "warning"}>{String(trade.status ?? "--")}</StatusPill>
            </article>
          ))}
          {backtest.trades.length === 0 ? <div className="market-snapshot-empty">No real trades connected.</div> : null}
        </div>
      </section>
    </section>
  );
}
