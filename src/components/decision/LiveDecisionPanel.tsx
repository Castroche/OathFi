import { BrainCircuit, Gauge, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import { useLiveDecisionStore } from "../../stores/liveDecisionStore";
import { ActionVerdict } from "./ActionVerdict";
import { BlockingReasonsList } from "./BlockingReasonsList";
import { DecisionEvidenceList } from "./DecisionEvidenceList";
import { ScoreBreakdown } from "./ScoreBreakdown";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function multiplier(value: number) {
  return value.toFixed(2);
}

export function LiveDecisionPanel() {
  const { t } = useTranslation();
  const decision = useLiveDecisionStore((state) => state.decision);
  const scoreTiles = [
    ["longConfidence", `${decision.longConfidence}/100`],
    ["shortConfidence", `${decision.shortConfidence}/100`],
    ["marketConfidence", `${decision.marketConfidence}/100`],
    ["finalConfidence", `${decision.finalConfidence}/100`],
    ["feasibilityScore", `${decision.feasibilityScore}/100`],
    ["riskScore", `${decision.riskScore}/100`],
  ] as const;
  const riskTiles = [
    ["newsRisk", pct(decision.newsRisk)],
    ["onChainRisk", pct(decision.onChainRisk)],
    ["macroRisk", pct(decision.macroRisk)],
    ["dataReliabilityMultiplier", multiplier(decision.dataReliabilityMultiplier)],
    ["conflictMultiplier", multiplier(decision.conflictMultiplier)],
    ["eventRiskMultiplier", multiplier(decision.eventRiskMultiplier)],
  ] as const;

  return (
    <section className="market-wide-panel live-decision-panel" aria-labelledby="live-decision-panel-title">
      <div className="market-panel-heading market-panel-heading--compact">
        <div>
          <span>
            <BrainCircuit size={15} aria-hidden="true" />
            {t("decision.panel.kicker")}
          </span>
          <h2 id="live-decision-panel-title">{t("decision.panel.title")}</h2>
        </div>
        <ActionVerdict action={decision.action} />
      </div>

      <div className="decision-panel-grid">
        {scoreTiles.map(([key, value]) => (
          <article className="decision-panel-tile" key={key}>
            <span>{t(`decision.metrics.${key}`)}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="decision-risk-grid">
        {riskTiles.map(([key, value]) => (
          <article className="decision-risk-tile" key={key}>
            <span>{t(`decision.metrics.${key}`)}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="decision-panel-body">
        <section>
          <div className="decision-subheading">
            <Gauge size={14} aria-hidden="true" />
            <span>{t("decision.sections.scoreBreakdown")}</span>
          </div>
          <ScoreBreakdown breakdown={decision.scoreBreakdown} />
        </section>
        <section>
          <div className="decision-subheading">
            <ShieldAlert size={14} aria-hidden="true" />
            <span>{t("decision.sections.hardBlock")}</span>
            <StatusPill variant={decision.hardBlock ? "danger" : "success"}>
              {decision.hardBlock ? t("decision.labels.hardBlockActive") : t("decision.labels.noHardBlock")}
            </StatusPill>
          </div>
          <BlockingReasonsList reasons={decision.hardBlockReasons} />
        </section>
      </div>

      <DecisionEvidenceList evidence={decision.evidence} warnings={decision.warnings} />
    </section>
  );
}
