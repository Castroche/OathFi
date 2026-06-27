import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RiskCheck } from "../../api/risk";
import { StatusPill } from "../common/StatusPill";
import { FinalRiskDecisionCard } from "./FinalRiskDecisionCard";
import { PositionSizingCard } from "./PositionSizingCard";
import { RiskDecisionCard } from "./RiskDecisionCard";
import { RuleEvaluationTable } from "./RuleEvaluationTable";

type RiskFirewallContentProps = {
  riskCheck?: RiskCheck;
  onSendToPaperExecution: () => void;
  onRejectStrategy: () => void;
  onReturnToAgentLab: () => void;
  isSendingPaperOrder: boolean;
  isRejectingStrategy: boolean;
};

export function RiskFirewallContent({
  riskCheck,
  onSendToPaperExecution,
  onRejectStrategy,
  onReturnToAgentLab,
  isSendingPaperOrder,
  isRejectingStrategy,
}: RiskFirewallContentProps) {
  const { t } = useTranslation();

  if (!riskCheck) {
    return (
      <section className="risk-firewall" aria-label={t("riskFirewall.aria")}>
        <div className="risk-brief">
          <div>
            <span className="risk-brief__eyebrow">{t("riskFirewall.sections.reviewTicket")}</span>
            <h2>{t("riskFirewall.empty.disconnectedTitle")}</h2>
            <p>{t("riskFirewall.empty.disconnectedBody")}</p>
          </div>
          <div className="risk-brief__decision">
            <ShieldAlert size={20} aria-hidden="true" />
            <StatusPill variant="warning">{t("marketLive.status.disconnected")}</StatusPill>
          </div>
        </div>
      </section>
    );
  }

  const ruleResults = riskCheck.rule_results ?? riskCheck.checks ?? [];

  return (
    <section className="risk-firewall" aria-label={t("riskFirewall.aria")}>
      <RiskDecisionCard riskCheck={riskCheck} />
      <div className="risk-grid">
        <PositionSizingCard riskCheck={riskCheck} />
        <RuleEvaluationTable rules={ruleResults} />
        <FinalRiskDecisionCard
          riskCheck={riskCheck}
          onSendToPaperExecution={onSendToPaperExecution}
          onRejectStrategy={onRejectStrategy}
          onReturnToAgentLab={onReturnToAgentLab}
          isSendingPaperOrder={isSendingPaperOrder}
          isRejectingStrategy={isRejectingStrategy}
        />
      </div>
    </section>
  );
}
