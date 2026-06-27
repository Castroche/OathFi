import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardRiskSummary } from "../../api/dashboard";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

type RiskSummaryCardProps = {
  risk?: DashboardRiskSummary;
};

function riskVariant(level?: string): StatusPillVariant {
  if (level === "low") return "success";
  if (level === "medium" || level === "unknown") return "warning";
  if (level === "high") return "danger";
  return "info";
}

export function RiskSummaryCard({ risk }: RiskSummaryCardProps) {
  const { t } = useTranslation();
  const level = risk?.global_risk_level ?? "unknown";

  return (
    <article className="command-metric">
      <header>
        <span className={`command-metric__icon command-state--${riskVariant(level)}`}>
          <ShieldCheck size={15} aria-hidden="true" />
        </span>
        <h2>{t("panels.riskSummary")}</h2>
      </header>
      <strong>{level}</strong>
      <p>
        {t("dashboard.labels.executionMode")}: {risk?.execution_mode ?? "paper"} / {t("status.liveTradingDisabled")}
      </p>
      <div className="risk-score-row">
        <span>
          {t("dashboard.labels.volatility")}
          <strong>{risk?.volatility_score ?? 0}</strong>
        </span>
        <span>
          {t("dashboard.labels.liquidity")}
          <strong>{risk?.liquidity_score ?? 0}</strong>
        </span>
      </div>
      <StatusPill variant={riskVariant(level)}>
        {risk?.latest_decision ?? t("status.riskModeGuarded")}
      </StatusPill>
    </article>
  );
}
