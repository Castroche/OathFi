import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type SafetyBannerRowProps = {
  orderId?: string;
  status?: string;
  onReturnToAgentLab: () => void;
  onReturnToRiskFirewall: () => void;
};

export function SafetyBannerRow({ orderId, status, onReturnToAgentLab, onReturnToRiskFirewall }: SafetyBannerRowProps) {
  const { t } = useTranslation();

  return (
    <section className="paper-brief" aria-labelledby="paper-safety-title">
      <div>
        <span className="paper-brief__eyebrow">{t("paperExecution.safety.kicker")}</span>
        <h2 id="paper-safety-title">{t("paperExecution.safety.title")}</h2>
        <p>{t("paperExecution.safety.body")}</p>
        <div className="paper-brief__meta">
          <StatusPill variant="info">{t("status.noRealFunds")}</StatusPill>
          <StatusPill variant="success">{t("status.paperTradingOnly")}</StatusPill>
          <StatusPill variant="danger">{t("status.liveTradingDisabled")}</StatusPill>
          <span>{orderId ?? t("paperExecution.empty.noOrderId")}</span>
          <span>{status ? statusLabel(t, status) : t("paperExecution.empty.noStatus")}</span>
        </div>
      </div>
      <div className="paper-brief__lock">
        <Lock size={24} aria-hidden="true" />
        <span>{t("paperExecution.brief.lockLabel")}</span>
        <strong>{t("paperExecution.safety.liveDisabled")}</strong>
        <button className="secondary-action" type="button" onClick={onReturnToRiskFirewall}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>{t("actions.returnToRiskFirewall", "Risk Firewall")}</span>
        </button>
        <button className="secondary-action" type="button" onClick={onReturnToAgentLab}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>{t("actions.returnToAgentLab")}</span>
        </button>
      </div>
    </section>
  );
}
