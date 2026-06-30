import { Database, Gauge, ShieldAlert, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RiskCheck } from "../../api/risk";
import { decisionLabel, executionModeLabel, riskLevelLabel, riskRuleLabel, riskRuleMessage, riskValueLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type RiskDecisionCardProps = {
  riskCheck: RiskCheck;
};

function decisionVariant(decision?: string) {
  if (decision === "REJECTED" || decision === "BLOCK") return "danger";
  if (decision === "CONDITIONAL" || decision === "WARNING") return "warning";
  if (decision === "APPROVED" || decision === "PASS") return "success";
  return "warning";
}

function formatSize(value: number) {
  return value > 0 ? value.toFixed(6).replace(/\.?0+$/, "") : "0";
}

export function RiskDecisionCard({ riskCheck }: RiskDecisionCardProps) {
  const { t } = useTranslation();
  const approvedForPaper = riskCheck.decision === "APPROVED";
  const riskScore = Number.isFinite(riskCheck.risk_score) ? riskCheck.risk_score : 0;
  const displayDecision = approvedForPaper ? t("riskFirewall.decisions.approvedForPaper") : decisionLabel(t, riskCheck.decision);
  const liveTrading = riskCheck.live_trading_enabled ? t("status.enabled") : t("status.disabled");
  const marketDataStatus = riskCheck.market_data_status ?? "live";
  const blockedRules = (riskCheck.rule_results ?? riskCheck.checks ?? []).filter((rule) => rule.status === "BLOCK" || rule.status === "REJECTED");

  const metrics = [
    {
      id: "riskLevel",
      icon: ShieldAlert,
      label: t("riskFirewall.labels.riskLevel"),
      value: riskLevelLabel(t, riskCheck.risk_level),
      meta: t("riskFirewall.labels.riskLevelMeta"),
    },
    {
      id: "liveTrading",
      icon: ShieldCheck,
      label: t("riskFirewall.labels.liveTradingDisabled"),
      value: liveTrading,
      meta: t("riskFirewall.labels.liveTradingMeta"),
    },
    {
      id: "executionMode",
      icon: SlidersHorizontal,
      label: t("riskFirewall.labels.executionMode"),
      value: executionModeLabel(t, riskCheck.execution_mode),
      meta: t("riskFirewall.labels.executionModeMeta"),
    },
    {
      id: "recommendedSize",
      icon: Gauge,
      label: t("riskFirewall.labels.recommendedSize"),
      value: formatSize(riskCheck.position_size ?? 0),
      meta: t("riskFirewall.labels.riskScore", { score: riskScore.toFixed(1) }),
    },
    {
      id: "marketData",
      icon: Database,
      label: t("riskFirewall.labels.marketDataStatus"),
      value: statusLabel(t, marketDataStatus),
      meta:
        marketDataStatus === "live"
          ? t("riskFirewall.labels.marketDataLive")
          : t("riskFirewall.labels.marketDataUnavailable"),
    },
  ];

  return (
    <>
      <div className="risk-brief">
        <div>
          <span className="risk-brief__eyebrow">{t("riskFirewall.sections.reviewTicket")}</span>
          <h2>{displayDecision}</h2>
          <p>{t("riskFirewall.brief.scope")}</p>
        </div>
        <div className="risk-brief__decision">
          <span>{t("riskFirewall.labels.riskDecision")}</span>
          <strong>{decisionLabel(t, riskCheck.decision)}</strong>
          <StatusPill variant={decisionVariant(riskCheck.decision)}>{riskLevelLabel(t, riskCheck.risk_level)}</StatusPill>
        </div>
      </div>
      {blockedRules.length ? (
        <div className="risk-rejection-summary">
          <strong>{t("riskFirewall.rejection.title", { count: blockedRules.length })}</strong>
          <p>{t("riskFirewall.rejection.summary")}</p>
          <div className="risk-rejection-summary__rules">
            {blockedRules.map((rule) => (
              <article key={rule.name}>
                <span>{riskRuleLabel(t, rule.name)}</span>
                <small>{t("riskFirewall.rejection.thresholdActual", { threshold: riskValueLabel(t, rule.threshold), actual: riskValueLabel(t, rule.actual) })}</small>
                <p>{riskRuleMessage(t, rule.name)}</p>
              </article>
            ))}
          </div>
          <p>{t("riskFirewall.rejection.suggestion")}</p>
        </div>
      ) : null}

      <div className="risk-metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="risk-metric" key={metric.id}>
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
    </>
  );
}
