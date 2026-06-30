import { ArrowRight, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardOpportunity } from "../../api/dashboard";
import { businessCopyLabel, sideLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type MainOpportunityCardProps = {
  opportunity?: DashboardOpportunity | null;
  isGenerating: boolean;
  onGenerateHypothesis: () => void;
  onViewSupportingData: () => void;
};

export function MainOpportunityCard({
  opportunity,
  isGenerating,
  onGenerateHypothesis,
  onViewSupportingData,
}: MainOpportunityCardProps) {
  const { t } = useTranslation();

  return (
    <section className="main-opportunity" aria-labelledby="main-opportunity">
      <div className="section-heading">
        <div className="section-heading__title">
          <Target size={15} aria-hidden="true" />
          <h2 id="main-opportunity">{t("commandCenter.sections.mainOpportunity")}</h2>
        </div>
        <StatusPill variant={opportunity ? "success" : "warning"}>
          {statusLabel(t, opportunity?.status ?? "disconnected")}
        </StatusPill>
      </div>
      {opportunity ? (
        <>
          <div className="opportunity-symbol">{opportunity.symbol}</div>
          <h3>{businessCopyLabel(t, opportunity.setup)}</h3>
          <p>
            {t("dashboard.labels.direction")}: {sideLabel(t, opportunity.direction)} / {t("dashboard.labels.confidence")}: {opportunity.confidence}
          </p>
          <dl className="opportunity-rules">
            <div>
              <dt>{t("dashboard.labels.setupQuality")}</dt>
              <dd>{opportunity.setup_quality}/100</dd>
            </div>
            <div>
              <dt>{t("dashboard.labels.timeHorizon")}</dt>
              <dd>{opportunity.time_horizon}</dd>
            </div>
            <div>
              <dt>{t("tables.rr")}</dt>
              <dd>{opportunity.risk_reward ?? "--"}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="market-snapshot-empty market-snapshot-empty--tall">
          {t("dashboard.empty.noOpportunity")}
        </div>
      )}
      <div className="command-action-row">
        <button className="secondary-action" type="button" disabled={isGenerating} onClick={onGenerateHypothesis}>
          <span>{isGenerating ? t("loadingStates.generating") : t("actions.generateHypothesis")}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
        <button className="secondary-action secondary-action--muted" type="button" onClick={onViewSupportingData}>
          <span>{t("dashboard.actions.viewSupportingData")}</span>
        </button>
      </div>
    </section>
  );
}
