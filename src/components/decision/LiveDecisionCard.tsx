import { Activity, Gauge, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import { useLiveDecisionStore } from "../../stores/liveDecisionStore";
import { ActionVerdict } from "./ActionVerdict";
import { BlockingReasonsList } from "./BlockingReasonsList";
import { DecisionEvidenceList } from "./DecisionEvidenceList";

function scoreClass(value: number, inverse = false) {
  if (inverse) {
    if (value >= 70) return "danger";
    if (value >= 45) return "warning";
    return "success";
  }
  if (value >= 70) return "success";
  if (value >= 45) return "warning";
  return "danger";
}

export function LiveDecisionCard() {
  const { t } = useTranslation();
  const decision = useLiveDecisionStore((state) => state.decision);
  const scoreRows = [
    {
      key: "confidence",
      label: t("decision.labels.confidence"),
      value: decision.confidence,
      icon: Sparkles,
      variant: scoreClass(decision.confidence),
    },
    {
      key: "feasibility",
      label: t("decision.labels.feasibility"),
      value: decision.feasibility,
      icon: Gauge,
      variant: scoreClass(decision.feasibility),
    },
    {
      key: "risk",
      label: t("decision.labels.risk"),
      value: decision.risk,
      icon: ShieldAlert,
      variant: scoreClass(decision.risk, true),
    },
  ] as const;

  return (
    <section className="live-decision-card" aria-labelledby="live-decision-card-title">
      <div className="section-heading">
        <h2 id="live-decision-card-title">{t("decision.card.title")}</h2>
        <ActionVerdict action={decision.action} />
      </div>
      <div className="live-decision-card__symbol">
        <div>
          <span>{t("tables.symbol")}</span>
          <strong>{decision.symbol}</strong>
        </div>
        <StatusPill variant="info">
          <Activity size={13} aria-hidden="true" />
          {t(`decision.regimes.${decision.marketRegime}`)}
        </StatusPill>
      </div>
      <p>{decision.currentSetup}</p>
      <div className="live-decision-score-grid">
        {scoreRows.map((row) => {
          const ScoreIcon = row.icon;
          return (
            <article className={`live-score live-score--${row.variant}`} key={row.key}>
              <span>
                <ScoreIcon size={14} aria-hidden="true" />
                {row.label}
              </span>
              <strong>{row.value}/100</strong>
              <i style={{ width: `${row.value}%` }} aria-hidden="true" />
            </article>
          );
        })}
      </div>
      <dl className="decision-meta-list">
        <div>
          <dt>{t("decision.labels.nextConfirmation")}</dt>
          <dd>{decision.nextConfirmation}</dd>
        </div>
        <div>
          <dt>{t("decision.labels.longShort")}</dt>
          <dd>
            {decision.longConfidence}/100 · {decision.shortConfidence}/100
          </dd>
        </div>
      </dl>
      <DecisionEvidenceList evidence={decision.evidence} warnings={decision.warnings} />
      <BlockingReasonsList reasons={decision.hardBlockReasons} />
    </section>
  );
}
