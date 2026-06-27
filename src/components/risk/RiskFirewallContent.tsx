import { ArrowRight, Gauge, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { RiskCheck } from "../../api/risk";

type RiskFirewallContentProps = {
  riskCheck?: RiskCheck;
  onSendToPaperExecution: () => void;
  isSendingPaperOrder: boolean;
};

function decisionVariant(decision?: string) {
  if (decision === "BLOCK") return "danger";
  if (decision === "WARNING") return "warning";
  if (decision === "PASS") return "success";
  return "warning";
}

export function RiskFirewallContent({ riskCheck, onSendToPaperExecution, isSendingPaperOrder }: RiskFirewallContentProps) {
  const { t } = useTranslation();

  if (!riskCheck) {
    return (
      <section className="risk-firewall" aria-label={t("riskFirewall.aria")}>
        <div className="risk-brief">
          <div>
            <span className="risk-brief__eyebrow">{t("riskFirewall.sections.executionGate")}</span>
            <h2>Disconnected</h2>
            <p>No real risk check is connected. Simulated risk rules are hidden.</p>
          </div>
          <StatusPill variant="warning">disconnected</StatusPill>
        </div>
      </section>
    );
  }

  return (
    <section className="risk-firewall" aria-label={t("riskFirewall.aria")}>
      <div className="risk-brief">
        <div>
          <span className="risk-brief__eyebrow">{t("riskFirewall.sections.executionGate")}</span>
          <h2>{riskCheck.id}</h2>
          <p>{riskCheck.source}</p>
        </div>
        <StatusPill variant={decisionVariant(riskCheck.decision)}>{riskCheck.decision}</StatusPill>
      </div>

      <div className="risk-metrics">
        {[
          { id: "decision", icon: ShieldCheck, label: "Decision", value: riskCheck.decision, meta: riskCheck.status },
          { id: "warnings", icon: ShieldAlert, label: "Warnings", value: String(riskCheck.warnings.length), meta: riskCheck.warnings.join("; ") || "none" },
          { id: "blocks", icon: ShieldAlert, label: "Blocks", value: String(riskCheck.block_reasons.length), meta: riskCheck.block_reasons.join("; ") || "none" },
          { id: "source", icon: Gauge, label: "Source", value: riskCheck.source, meta: riskCheck.is_mock ? "mock" : "real" },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="risk-metric" key={metric.id}>
              <span className="command-state--info">
                <Icon size={15} aria-hidden="true" />
              </span>
              <div>
                <h3>{metric.label}</h3>
                <strong>{metric.value}</strong>
                <p>{metric.meta}</p>
              </div>
            </article>
          );
        })}
      </div>

      <section className="risk-panel" aria-labelledby="risk-checks-title">
        <div className="risk-panel__heading">
          <span id="risk-checks-title">
            <ShieldCheck size={15} aria-hidden="true" />
            Backend checks
          </span>
          <button className="secondary-action" type="button" disabled={isSendingPaperOrder} onClick={onSendToPaperExecution}>
            <span>{isSendingPaperOrder ? t("loadingStates.creatingOrder") : t("actions.sendToExecution")}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="risk-rule-table">
          {riskCheck.checks.map((check) => (
            <article className="risk-rule-row" key={check.name}>
              <span>{check.name}</span>
              <strong>{check.message}</strong>
              <StatusPill variant={decisionVariant(check.status)}>{check.status}</StatusPill>
            </article>
          ))}
          {riskCheck.checks.length === 0 ? <div className="market-snapshot-empty">No real checks connected.</div> : null}
        </div>
      </section>
    </section>
  );
}
