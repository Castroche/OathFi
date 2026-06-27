import { Database, Gauge, ShieldAlert, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RiskCheck } from "../../api/risk";
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
  const displayDecision = approvedForPaper ? t("riskFirewall.decisions.approvedForPaper") : t(`riskFirewall.decisions.${riskCheck.decision.toLowerCase()}`, riskCheck.decision);
  const liveTrading = riskCheck.live_trading_enabled ? t("status.enabled") : t("status.disabled");
  const marketDataStatus = riskCheck.market_data_status ?? "live";

  const metrics = [
    {
      id: "riskLevel",
      icon: ShieldAlert,
      label: t("riskFirewall.labels.riskLevel"),
      value: riskCheck.risk_level,
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
      value: riskCheck.execution_mode,
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
      value: marketDataStatus,
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
          <strong>{riskCheck.decision}</strong>
          <StatusPill variant={decisionVariant(riskCheck.decision)}>{riskCheck.risk_level}</StatusPill>
        </div>
      </div>

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
