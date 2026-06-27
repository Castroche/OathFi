import { Edit3, FlaskConical, Play, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentHypothesis } from "../../api/agent";
import { StatusPill } from "../common/StatusPill";

type HypothesisCardProps = {
  hypothesis: AgentHypothesis;
  isSelected: boolean;
  isRunningBacktest: boolean;
  isRejecting: boolean;
  onRunBacktest: (hypothesis: AgentHypothesis) => void;
  onEditRule: (hypothesis: AgentHypothesis) => void;
  onReject: (hypothesis: AgentHypothesis) => void;
};

export function HypothesisCard({
  hypothesis,
  isSelected,
  isRunningBacktest,
  isRejecting,
  onRunBacktest,
  onEditRule,
  onReject,
}: HypothesisCardProps) {
  const { t } = useTranslation();
  const isRejected = hypothesis.status === "rejected";

  return (
    <article className={isSelected ? "agent-hypothesis-card is-selected" : "agent-hypothesis-card"}>
      <header>
        <span className="agent-hypothesis-card__badge">
          <FlaskConical size={15} aria-hidden="true" />
          {hypothesis.label}
        </span>
        <StatusPill variant={isRejected ? "danger" : hypothesis.is_ai_generated ? "success" : "warning"}>
          {hypothesis.is_ai_generated ? hypothesis.status : "rule-based"}
        </StatusPill>
      </header>
      {!hypothesis.is_ai_generated ? <div className="action-feedback action-feedback--warning">Rule-based fallback, not AI provider output.</div> : null}
      <div className="agent-hypothesis-card__title">
        <h3>{hypothesis.type}</h3>
        <strong>{hypothesis.confidence}</strong>
      </div>
      <dl>
        <div>
          <dt>{t("agentLab.fields.trigger", "Trigger")}</dt>
          <dd>{hypothesis.trigger}</dd>
        </div>
        <div>
          <dt>{t("agentLab.fields.invalidation", "Invalidation")}</dt>
          <dd>{hypothesis.invalidation}</dd>
        </div>
        <div>
          <dt>{t("agentLab.fields.risk", "Risk")}</dt>
          <dd>{hypothesis.risk}</dd>
        </div>
        <div>
          <dt>{t("agentLab.fields.backtestRule", "Backtest Rule")}</dt>
          <dd>{hypothesis.backtest_rule}</dd>
        </div>
        <div>
          <dt>{t("agentLab.fields.suggestedAction", "Suggested Action")}</dt>
          <dd>{hypothesis.suggested_action}</dd>
        </div>
      </dl>
      <div className="agent-hypothesis-card__actions">
        <button type="button" className="secondary-action" disabled={isRejected || isRunningBacktest} onClick={() => onRunBacktest(hypothesis)}>
          <Play size={14} aria-hidden="true" />
          <span>{isRunningBacktest ? t("loadingStates.backtesting") : t("agentLab.actions.runBacktest", "Run Backtest")}</span>
        </button>
        <button type="button" className="secondary-action" disabled={isRejected} onClick={() => onEditRule(hypothesis)}>
          <Edit3 size={14} aria-hidden="true" />
          <span>{t("agentLab.actions.editRule", "Edit Rule")}</span>
        </button>
        <button type="button" className="secondary-action secondary-action--danger" disabled={isRejected || isRejecting} onClick={() => onReject(hypothesis)}>
          <XCircle size={14} aria-hidden="true" />
          <span>{isRejecting ? t("agentLab.actions.rejecting", "Rejecting...") : t("agentLab.actions.reject", "Reject")}</span>
        </button>
      </div>
    </article>
  );
}
