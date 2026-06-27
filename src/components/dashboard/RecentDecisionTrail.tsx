import { ArrowRight, FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardDecision } from "../../api/dashboard";
import { StatusPill } from "../common/StatusPill";

type RecentDecisionTrailProps = {
  decisions: DashboardDecision[];
  isLoading: boolean;
  onViewAudit: () => void;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function RecentDecisionTrail({ decisions, isLoading, onViewAudit }: RecentDecisionTrailProps) {
  const { t } = useTranslation();

  return (
    <section className="decision-audit" aria-labelledby="agent-decisions">
      <div className="section-heading">
        <div className="section-heading__title">
          <FileSearch size={15} aria-hidden="true" />
          <h2 id="agent-decisions">{t("commandCenter.sections.agentDecisions")}</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onViewAudit}>
          <span>{t("dashboard.actions.viewAudit")}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="decision-list">
        {decisions.map((decision) => (
          <article className="decision-item" key={decision.id}>
            <time>{formatTime(decision.created_at)}</time>
            <div>
              <h3>{decision.action_type}</h3>
              <p>{decision.message}</p>
            </div>
            <StatusPill variant={decision.status === "failed" ? "danger" : "info"}>
              {decision.entity_type}
            </StatusPill>
          </article>
        ))}
        {isLoading ? <div className="market-snapshot-empty">{t("loadingStates.syncing")}</div> : null}
        {!isLoading && decisions.length === 0 ? (
          <div className="market-snapshot-empty">{t("dashboard.empty.noDecisions")}</div>
        ) : null}
      </div>
      <div className="audit-strip" aria-label={t("commandCenter.sections.auditTrail")}>
        {["market_event", "hypothesis", "backtest", "risk_check", "paper_order", "audit_report"].map((entity, index) => {
          const matched = decisions.find((decision) => decision.entity_type === entity);
          return (
            <div className="audit-step" key={entity}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{entity.replace("_", " ")}</strong>
                <p>{matched?.entity_id ?? t("marketLive.status.disconnected")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
