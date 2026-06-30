import { Activity, BarChart3, FileText, LineChart, ListChecks, ShieldCheck, Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { Backtest } from "../../api/backtests";

type BacktestStudioContentProps = {
  backtest?: Backtest;
};

type MetricCard = {
  id: string;
  icon: typeof Activity;
  label: string;
  value: string;
  meta: string;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
}

function formatRuleValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function chartPath(rows: Record<string, unknown>[], valueKey: string) {
  const values = rows.map((row) => Number(row[valueKey])).filter(Number.isFinite);
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 36 - ((value - min) / span) * 32;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function BacktestSummaryCards({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  const cards: MetricCard[] = [
    { id: "win-rate", icon: Activity, label: t("backtestStudio.metrics.winRate.title"), value: formatPercent(backtest.win_rate), meta: backtest.sample_quality },
    { id: "profit-factor", icon: BarChart3, label: t("backtestStudio.metrics.profitFactor.title"), value: backtest.profit_factor.toFixed(2), meta: t("backtestStudio.metrics.profitFactor.meta") },
    { id: "drawdown", icon: LineChart, label: t("backtestStudio.metrics.maxDrawdown.title"), value: formatPercent(backtest.max_drawdown), meta: `${t("backtestStudio.metrics.averageRr.title")} ${backtest.avg_rr.toFixed(2)}` },
    { id: "trades", icon: Table2, label: t("backtestStudio.metrics.totalTrades.title"), value: String(backtest.trade_count), meta: `${t("backtestStudio.labels.sampleSize")}: ${backtest.sample_size}` },
    { id: "fees", icon: ShieldCheck, label: t("backtestStudio.labels.fees"), value: formatPercent(backtest.fees), meta: `${t("backtestStudio.labels.slippage")} ${formatPercent(backtest.slippage)}` },
    { id: "equity", icon: FileText, label: t("backtestStudio.labels.finalEquity"), value: formatMoney(backtest.final_equity), meta: `${t("backtestStudio.labels.netPnl")} ${formatMoney(backtest.net_pnl)}` },
  ];
  return (
    <div className="backtest-metrics" aria-label={t("backtestStudio.sections.metrics")}>
      {cards.map((metric) => {
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
  );
}

function BacktestEquityCurve({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  return (
    <section className="backtest-panel" aria-labelledby="backtest-equity-title">
      <div className="backtest-panel__heading">
        <span><LineChart size={15} aria-hidden="true" />{t("backtestStudio.sections.equityCurve")}</span>
        <StatusPill variant="success">{backtest.equity_curve.length}</StatusPill>
      </div>
      <h2 id="backtest-equity-title">{t("backtestStudio.charts.equityTitle")}</h2>
      <svg className="backtest-mini-chart" viewBox="0 0 100 40" role="img" aria-label={t("backtestStudio.charts.equityAria")}>
        <path d={chartPath(backtest.equity_curve, "equity")} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </section>
  );
}

function BacktestDrawdownCurve({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  return (
    <section className="backtest-panel" aria-labelledby="backtest-drawdown-title">
      <div className="backtest-panel__heading">
        <span><LineChart size={15} aria-hidden="true" />{t("backtestStudio.sections.drawdownCurve")}</span>
        <StatusPill variant="warning">{formatPercent(backtest.max_drawdown)}</StatusPill>
      </div>
      <h2 id="backtest-drawdown-title">{t("backtestStudio.charts.drawdownTitle")}</h2>
      <svg className="backtest-mini-chart backtest-mini-chart--danger" viewBox="0 0 100 40" role="img" aria-label={t("backtestStudio.charts.drawdownAria")}>
        <path d={chartPath(backtest.drawdown_curve, "drawdown")} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </section>
  );
}

function BacktestRuleSnapshot({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  const rule = backtest.strategy_rule_snapshot;
  return (
    <section className="backtest-panel" aria-labelledby="backtest-rule-title">
      <div className="backtest-panel__heading">
        <span><ListChecks size={15} aria-hidden="true" />{t("backtestStudio.sections.strategyRule")}</span>
        <StatusPill variant="info">{t("backtestStudio.status.ruleLocked")}</StatusPill>
      </div>
      <h2 id="backtest-rule-title">{String(rule.direction ?? "--")}</h2>
      <div className="backtest-assumption-list">
        {Object.entries(rule).map(([key, value]) => (
          <span key={key}><strong>{t(`display.metric.${key}`, { defaultValue: key })}</strong>{formatRuleValue(value)}</span>
        ))}
      </div>
    </section>
  );
}

function BacktestAssumptions({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  return (
    <section className="backtest-panel" aria-labelledby="backtest-assumptions-title">
      <div className="backtest-panel__heading">
        <span><ShieldCheck size={15} aria-hidden="true" />{t("backtestStudio.sections.assumptions")}</span>
        <StatusPill variant={backtest.is_mock ? "danger" : "success"}>{backtest.is_mock ? t("marketLive.status.mock") : t("backtestStudio.labels.realData")}</StatusPill>
      </div>
      <h2 id="backtest-assumptions-title">{backtest.methodology}</h2>
      <div className="backtest-assumption-list">
        <span><strong>{t("backtestStudio.labels.strategy")}</strong>{backtest.strategy_id}</span>
        <span><strong>{t("backtestStudio.labels.symbol")}</strong>{backtest.symbol}</span>
        <span><strong>{t("backtestStudio.labels.timeframe")}</strong>{backtest.timeframe}</span>
        <span><strong>{t("backtestStudio.labels.dataSource")}</strong>{backtest.data_source}</span>
        <span><strong>{t("backtestStudio.labels.sampleSize")}</strong>{backtest.sample_size}</span>
        <span><strong>{t("backtestStudio.labels.exposureTime")}</strong>{formatPercent(backtest.exposure_time)}</span>
      </div>
    </section>
  );
}

function BacktestVerdictPanel({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  const decision = String(backtest.verdict.decision ?? "caution");
  const limitations = Array.isArray(backtest.verdict.limitations) ? backtest.verdict.limitations : [];
  return (
    <section className="backtest-panel" aria-labelledby="backtest-verdict-title">
      <div className="backtest-panel__heading">
        <span><ShieldCheck size={15} aria-hidden="true" />{t("backtestStudio.sections.verdict")}</span>
        <StatusPill variant={decision === "pass" ? "success" : "warning"}>{t(`display.decision.${decision}`, { defaultValue: decision })}</StatusPill>
      </div>
      <h2 id="backtest-verdict-title">{String(backtest.verdict.summary ?? t("backtestStudio.verdict.title"))}</h2>
      {decision !== "pass" ? (
        <div className="action-feedback action-feedback--warning">
          {t("backtestStudio.verdict.reviewOnly", "只能够复核，不能模拟下单")}
        </div>
      ) : null}
      <div className="backtest-assumption-list">
        {limitations.map((item) => (
          <span key={String(item)}><strong>{t("backtestStudio.labels.limitations")}</strong>{t(`display.metric.${String(item)}`, { defaultValue: String(item) })}</span>
        ))}
      </div>
    </section>
  );
}

function BacktestTradeTable({ backtest }: { backtest: Backtest }) {
  const { t } = useTranslation();
  return (
    <section className="backtest-panel" aria-labelledby="backtest-trades-title">
      <div className="backtest-panel__heading">
        <span><Table2 size={15} aria-hidden="true" />{t("backtestStudio.sections.tradeList")}</span>
        <StatusPill variant={backtest.trades.length > 0 ? "success" : "warning"}>{backtest.trades.length}</StatusPill>
      </div>
      <h2 id="backtest-trades-title">{t("backtestStudio.tradeList.title")}</h2>
      <div className="backtest-trade-table">
        <div className="backtest-trade-table__header">
          <span>{t("tables.time")}</span>
          <span>{t("tables.side")}</span>
          <span>{t("tables.entry")}</span>
          <span>{t("tables.exit")}</span>
          <span>{t("tables.pnl")}</span>
          <span>{t("tables.rr")}</span>
          <span>{t("tables.status")}</span>
        </div>
        {backtest.trades.slice(0, 50).map((trade, index) => (
          <article className="backtest-trade-row" key={`${String(trade.time)}-${index}`}>
            <time>{String(trade.time ?? "--")}</time>
            <span>{t(`display.side.${String(trade.side ?? "unknown")}`, { defaultValue: String(trade.side ?? "--") })}</span>
            <span>{String(trade.entry ?? "--")}</span>
            <span>{String(trade.exit ?? "--")}</span>
            <strong>{String(trade.pnl ?? "--")}</strong>
            <span>{String(trade.rr ?? "--")}</span>
            <StatusPill variant={trade.status === "win" ? "success" : "warning"}>{t(`display.status.${String(trade.status ?? "unknown")}`, { defaultValue: String(trade.status ?? "--") })}</StatusPill>
          </article>
        ))}
        {backtest.trades.length === 0 ? <div className="market-snapshot-empty">{t("backtestStudio.empty.noTrades")}</div> : null}
      </div>
    </section>
  );
}

export function BacktestStudioContent({ backtest }: BacktestStudioContentProps) {
  const { t } = useTranslation();

  if (!backtest) {
    return (
      <section className="backtest-studio" aria-label={t("backtestStudio.aria")}>
        <div className="backtest-brief">
          <div>
            <span className="backtest-brief__eyebrow">{t("backtestStudio.sections.validationTicket")}</span>
            <h2>{t("marketLive.status.disconnected")}</h2>
            <p>{t("backtestStudio.empty.noBacktest")}</p>
          </div>
          <StatusPill variant="warning">{t("marketLive.status.disconnected")}</StatusPill>
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
          <StatusPill variant={backtest.is_mock ? "danger" : "success"}>{backtest.is_mock ? t("marketLive.status.mock") : t("backtestStudio.labels.realData")}</StatusPill>
        </div>
      </div>

      <BacktestSummaryCards backtest={backtest} />
      <div className="backtest-report-grid">
        <BacktestEquityCurve backtest={backtest} />
        <BacktestDrawdownCurve backtest={backtest} />
        <BacktestRuleSnapshot backtest={backtest} />
        <BacktestAssumptions backtest={backtest} />
        <BacktestVerdictPanel backtest={backtest} />
      </div>
      <BacktestTradeTable backtest={backtest} />
    </section>
  );
}
