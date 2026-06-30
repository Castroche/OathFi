import { ArrowLeft, ArrowRight, Ban, CheckCircle2, FileWarning, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RiskCheck } from "../../api/risk";
import { decisionLabel, riskRuleMessage } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type FinalRiskDecisionCardProps = {
  riskCheck: RiskCheck;
  onSendToPaperExecution: () => void;
  onRejectStrategy: () => void;
  onReturnToAgentLab: () => void;
  isSendingPaperOrder: boolean;
  isRejectingStrategy: boolean;
};

function variant(decision: string) {
  if (decision === "REJECTED" || decision === "BLOCK") return "danger";
  if (decision === "CONDITIONAL" || decision === "WARNING") return "warning";
  return "success";
}

export function FinalRiskDecisionCard({
  riskCheck,
  onSendToPaperExecution,
  onRejectStrategy,
  onReturnToAgentLab,
  isSendingPaperOrder,
  isRejectingStrategy,
}: FinalRiskDecisionCardProps) {
  const { t } = useTranslation();
  const isRejected = riskCheck.decision === "REJECTED" || riskCheck.decision === "BLOCK";
  const isPaperOrderBlocked = riskCheck.decision !== "APPROVED";
  const titleKey = isRejected
    ? "riskFirewall.finalDecision.rejected"
    : riskCheck.decision === "CONDITIONAL"
      ? "riskFirewall.finalDecision.conditional"
      : "riskFirewall.finalDecision.approved";
  const summaryKey = isRejected
    ? "riskFirewall.finalDecision.rejectedSummary"
    : riskCheck.decision === "CONDITIONAL"
      ? "riskFirewall.finalDecision.conditionalSummary"
      : "riskFirewall.finalDecision.approvedSummary";
  const controls = [
    { icon: CheckCircle2, text: t("riskFirewall.final.controls.paperOnly") },
    { icon: FileWarning, text: t("riskFirewall.final.controls.riskCheckId", { id: riskCheck.id }) },
    { icon: Ban, text: t("riskFirewall.final.controls.liveDisabled") },
    { icon: RotateCcw, text: t("riskFirewall.final.controls.audit") },
  ];
  const blocks = riskCheck.blocks?.length ? riskCheck.blocks : riskCheck.block_reasons ?? [];
  const warnings = riskCheck.warnings ?? [];

  return (
    <section className="risk-panel risk-panel--final" aria-labelledby="risk-final-title">
      <div className="risk-panel__heading">
        <span id="risk-final-title">{t("riskFirewall.sections.finalDecision")}</span>
        <StatusPill variant={variant(riskCheck.decision)}>{decisionLabel(t, riskCheck.decision)}</StatusPill>
      </div>
      <h2>{t(titleKey)}</h2>
      <p>{t(summaryKey)}</p>

      <div className="final-risk-controls">
        {controls.map((control) => {
          const Icon = control.icon;
          return (
            <div className="final-risk-control" key={control.text}>
              <Icon size={15} aria-hidden="true" />
              <span>{control.text}</span>
            </div>
          );
        })}
      </div>

      {blocks.length || warnings.length ? (
        <div className="final-risk-alerts">
          {blocks.length ? (
            <div>
              <strong>{t("riskFirewall.final.blocks", "Blocking reasons")}</strong>
              <ul>
                {blocks.map((block) => (
                  <li key={block}>{riskRuleMessage(t, block)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {warnings.length ? (
            <div>
              <strong>{t("riskFirewall.final.warnings", "Warnings")}</strong>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{riskRuleMessage(t, warning)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="risk-actions" aria-label={t("riskFirewall.sections.actions")}>
        <button className="secondary-action" type="button" onClick={onReturnToAgentLab}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>{t("actions.returnToAgentLab")}</span>
        </button>
        <button className="secondary-action risk-action--danger" type="button" disabled={isRejectingStrategy} onClick={onRejectStrategy}>
          <Ban size={14} aria-hidden="true" />
          <span>{isRejectingStrategy ? t("riskFirewall.actions.rejecting") : t("actions.rejectStrategy")}</span>
        </button>
        <button
          className="primary-action"
          type="button"
          title={isPaperOrderBlocked ? t(summaryKey) : undefined}
          disabled={isPaperOrderBlocked || isSendingPaperOrder}
          onClick={onSendToPaperExecution}
        >
          <span>{isSendingPaperOrder ? t("loadingStates.creatingOrder") : t("actions.sendToPaperExecution")}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
