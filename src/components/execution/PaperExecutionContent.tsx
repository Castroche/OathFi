import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../../api/settings";
import type { PaperAccount, PaperExecutionLog, PaperOrder, PaperPosition } from "../../api/paperOrders";
import type { RiskCheck } from "../../api/risk";
import { riskRuleMessage } from "../../lib/displayLabels";
import { ActivePaperPositions } from "./ActivePaperPositions";
import { ExecutionLogTable } from "./ExecutionLogTable";
import { ExecutionPreview } from "./ExecutionPreview";
import { OrderTicket } from "./OrderTicket";
import { PaperSummaryCard } from "./PaperSummaryCard";
import { SafetyBannerRow } from "./SafetyBannerRow";

type PaperExecutionContentProps = {
  paperOrder?: PaperOrder;
  riskCheck?: RiskCheck;
  paperAccount?: PaperAccount;
  paperPositions: PaperPosition[];
  executionLogs: PaperExecutionLog[];
  blockReason?: string;
  orderError?: string | null;
  accountError?: string | null;
  positionsError?: string | null;
  logsError?: string | null;
  isOrderLoading: boolean;
  isAccountLoading: boolean;
  isPositionsLoading: boolean;
  isLogsLoading: boolean;
  onExecutePaperTrade: () => void;
  onCancelPaperTrade: () => void;
  onReturnToAgentLab: () => void;
  onReturnToRiskFirewall: () => void;
  onGenerateReviewReport: () => void;
  isExecutingPaperOrder: boolean;
  isCancellingPaperOrder: boolean;
  isGeneratingReviewReport: boolean;
  canGenerateReviewReport: boolean;
  canExecutePaperOrder: boolean;
  disabledReason?: string;
};

export function PaperExecutionContent({
  paperOrder,
  riskCheck,
  paperAccount,
  paperPositions,
  executionLogs,
  blockReason,
  orderError,
  accountError,
  positionsError,
  logsError,
  isOrderLoading,
  isAccountLoading,
  isPositionsLoading,
  isLogsLoading,
  onExecutePaperTrade,
  onCancelPaperTrade,
  onReturnToAgentLab,
  onReturnToRiskFirewall,
  onGenerateReviewReport,
  isExecutingPaperOrder,
  isCancellingPaperOrder,
  isGeneratingReviewReport,
  canGenerateReviewReport,
  canExecutePaperOrder,
  disabledReason,
}: PaperExecutionContentProps) {
  const { t } = useTranslation();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });
  const settings = settingsQuery.data;
  const reason =
    orderError ||
    (blockReason ? blockReason.split(";").map((item) => riskRuleMessage(t, item.trim())).join("; ") : undefined) ||
    disabledReason ||
    (!paperOrder && !isOrderLoading ? t("paperExecution.empty.noOrderLoaded") : undefined);
  const riskSummary = riskCheck ?? paperOrder?.risk_check;
  const riskRejected = !paperOrder && riskSummary && ["REJECTED", "BLOCK"].includes(String(riskSummary.decision ?? riskSummary.status).toUpperCase());

  return (
    <section className="paper-execution" aria-label={t("paperExecution.aria")}>
      <SafetyBannerRow
        orderId={paperOrder?.id}
        status={paperOrder?.status}
        onReturnToAgentLab={onReturnToAgentLab}
        onReturnToRiskFirewall={onReturnToRiskFirewall}
      />

      {settings?.paper_trading_enabled === false ? (
        <div className="action-feedback action-feedback--warning">{t("settings.status.paperExecutionUnavailable")}</div>
      ) : null}

      {reason ? <div className={orderError ? "action-feedback action-feedback--error" : "action-feedback"}>{reason}</div> : null}
      {riskRejected ? (
        <div className="action-feedback action-feedback--warning">
          <strong>{t("paperExecution.rejected.title")}</strong>
          <span>{t("paperExecution.rejected.noOrder")}</span>
          <button type="button" disabled={!canGenerateReviewReport || isGeneratingReviewReport} onClick={onGenerateReviewReport}>
            {isGeneratingReviewReport ? t("loadingStates.syncing") : t("paperExecution.rejected.generateAudit")}
          </button>
        </div>
      ) : null}
      {isOrderLoading ? <div className="market-snapshot-empty">{t("loadingStates.syncing")}</div> : null}

      <PaperSummaryCard paperOrder={paperOrder} account={paperAccount} accountError={accountError} />

      <div className="paper-grid">
        <OrderTicket
          paperOrder={paperOrder}
          riskCheck={riskSummary}
          isExecuting={isExecutingPaperOrder}
          isCancelling={isCancellingPaperOrder}
          disabledReason={canExecutePaperOrder ? undefined : disabledReason || blockReason}
          onExecute={onExecutePaperTrade}
          onCancel={onCancelPaperTrade}
        />
        <ExecutionPreview
          paperOrder={paperOrder}
          riskCheck={riskSummary}
          onGenerateReviewReport={onGenerateReviewReport}
          isGeneratingReviewReport={isGeneratingReviewReport}
          canGenerateReviewReport={canGenerateReviewReport}
        />
        <ActivePaperPositions positions={paperPositions} isLoading={isAccountLoading || isPositionsLoading} error={positionsError ?? accountError} />
        <ExecutionLogTable logs={executionLogs} isLoading={isLogsLoading} error={logsError} />
      </div>
    </section>
  );
}
