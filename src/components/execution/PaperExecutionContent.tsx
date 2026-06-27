import { Lock, Radio, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { PaperOrder } from "../../api/paperOrders";
import type { RiskCheck } from "../../api/risk";

type PaperExecutionContentProps = {
  paperOrder?: PaperOrder;
  riskCheck?: RiskCheck;
  blockReason?: string;
  onExecutePaperTrade: () => void;
  isCreatingPaperOrder: boolean;
  canExecutePaperOrder: boolean;
  disabledReason?: string;
};

export function PaperExecutionContent({
  paperOrder,
  riskCheck,
  blockReason,
  isCreatingPaperOrder,
  disabledReason,
}: PaperExecutionContentProps) {
  const { t } = useTranslation();
  const reason = blockReason || disabledReason || "Exchange execution is not connected. Simulated paper execution is disabled.";

  return (
    <section className="paper-execution" aria-label={t("paperExecution.aria")}>
      <div className="execution-brief">
        <div>
          <span className="execution-brief__eyebrow">{t("paperExecution.sections.executionTicket")}</span>
          <h2>{paperOrder?.id ?? "Disconnected"}</h2>
          <p>{paperOrder ? `${paperOrder.symbol} ${paperOrder.side} ${paperOrder.quantity}` : reason}</p>
        </div>
        <div className="execution-brief__meta">
          <StatusPill variant="danger">
            <Lock size={13} aria-hidden="true" />
            {t("status.liveTradingDisabled")}
          </StatusPill>
          <StatusPill variant={paperOrder ? "success" : "warning"}>{paperOrder ? paperOrder.status : "disconnected"}</StatusPill>
        </div>
      </div>

      <div className="execution-grid">
        <section className="execution-panel" aria-labelledby="execution-status-title">
          <div className="execution-panel__heading">
            <span id="execution-status-title">
              <Radio size={15} aria-hidden="true" />
              Execution connection
            </span>
            <StatusPill variant="warning">{isCreatingPaperOrder ? t("loadingStates.creatingOrder") : "not connected"}</StatusPill>
          </div>
          <p>{reason}</p>
        </section>

        <section className="execution-panel" aria-labelledby="execution-risk-title">
          <div className="execution-panel__heading">
            <span id="execution-risk-title">
              <ShieldCheck size={15} aria-hidden="true" />
              Risk check
            </span>
            <StatusPill variant={riskCheck ? "success" : "warning"}>{riskCheck?.decision ?? "disconnected"}</StatusPill>
          </div>
          <p>{riskCheck ? riskCheck.id : "No real risk check is connected."}</p>
        </section>

        {paperOrder ? (
          <section className="execution-panel" aria-labelledby="execution-order-title">
            <div className="execution-panel__heading">
              <span id="execution-order-title">Order record</span>
              <StatusPill variant={paperOrder.is_mock ? "danger" : "success"}>{paperOrder.is_mock ? "mock" : "real"}</StatusPill>
            </div>
            <dl className="execution-summary">
              <div>
                <dt>price</dt>
                <dd>{paperOrder.price}</dd>
              </div>
              <div>
                <dt>quantity</dt>
                <dd>{paperOrder.quantity}</dd>
              </div>
              <div>
                <dt>source</dt>
                <dd>{paperOrder.source}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
    </section>
  );
}
