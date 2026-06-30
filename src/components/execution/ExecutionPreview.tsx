import { FileText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaperOrder } from "../../api/paperOrders";
import type { RiskCheck } from "../../api/risk";
import { decisionLabel, riskValueLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type ExecutionPreviewProps = {
  paperOrder?: PaperOrder;
  riskCheck?: RiskCheck | Partial<RiskCheck> | null;
  onGenerateReviewReport: () => void;
  isGeneratingReviewReport: boolean;
  canGenerateReviewReport: boolean;
};

function formatNumber(t: ReturnType<typeof useTranslation>["t"], value: number | null | undefined, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : riskValueLabel(t, "unavailable");
}

function fitLabel(t: ReturnType<typeof useTranslation>["t"], order?: PaperOrder) {
  const status = order?.risk_check?.market_data_status;
  if (!status) return riskValueLabel(t, "unavailable");
  return status === "live" ? t("paperExecution.preview.liveMarketData", "Live market data") : statusLabel(t, status);
}

export function ExecutionPreview({ paperOrder, riskCheck, onGenerateReviewReport, isGeneratingReviewReport, canGenerateReviewReport }: ExecutionPreviewProps) {
  const { t } = useTranslation();
  const riskSummary = riskCheck ?? paperOrder?.risk_check;
  const riskStatus = riskSummary?.decision ?? riskSummary?.status ?? paperOrder?.risk_status ?? "unavailable";
  const backtest = paperOrder?.backtest_result;
  const expectedProfit =
    typeof paperOrder?.take_profit === "number" && typeof paperOrder?.price === "number"
      ? Math.abs(paperOrder.take_profit - paperOrder.price) * (paperOrder.quantity ?? 0)
      : undefined;
  const rows = [
    {
      label: t("paperExecution.preview.expectedRiskReward"),
      value: formatNumber(t, riskSummary?.reward_risk as number | undefined),
      meta: t("paperExecution.preview.expectedRiskRewardMeta"),
      variant: "info",
    },
    {
      label: t("paperExecution.preview.maxLoss"),
      value: formatNumber(t, (riskSummary?.max_loss as number | undefined) ?? paperOrder?.risk_amount),
      meta: t("paperExecution.preview.maxLossMeta"),
      variant: "warning",
    },
    {
      label: t("paperExecution.preview.expectedProfit"),
      value: formatNumber(t, expectedProfit),
      meta: t("paperExecution.preview.expectedProfitMeta"),
      variant: "success",
    },
    {
      label: t("paperExecution.preview.riskFirewallStatus"),
      value: decisionLabel(t, String(riskStatus)),
      meta: paperOrder?.risk_check_id ?? t("paperExecution.empty.noRiskCheck"),
      variant: String(riskStatus).toUpperCase() === "REJECTED" || String(riskStatus).toUpperCase() === "BLOCK" ? "warning" : "success",
    },
    {
      label: t("paperExecution.preview.backtestVerdict"),
      value: backtest?.verdict ? statusLabel(t, backtest.verdict) : riskValueLabel(t, "unavailable"),
      meta: backtest
        ? t("paperExecution.preview.backtestStats", {
            profitFactor: formatNumber(t, backtest.profit_factor),
            tradeCount: backtest.trade_count ?? 0,
          })
        : t("paperExecution.empty.noBacktest"),
      variant: backtest ? "info" : "neutral",
    },
    {
      label: t("paperExecution.preview.marketConditionFit"),
      value: fitLabel(t, paperOrder),
      meta: t("paperExecution.preview.marketConditionFitMeta"),
      variant: "info",
    },
    {
      label: t("paperExecution.preview.positionSizing"),
      value: formatNumber(t, (riskSummary?.position_size as number | undefined) ?? paperOrder?.position_size),
      meta: t("paperExecution.preview.positionSizingMeta"),
      variant: "success",
    },
    {
      label: t("paperExecution.preview.correlationCheck"),
      value: riskSummary ? t("paperExecution.preview.correlationAvailable") : riskValueLabel(t, "unavailable"),
      meta: t("paperExecution.preview.correlationMeta"),
      variant: riskSummary ? "info" : "neutral",
    },
  ];

  return (
    <section className="paper-panel paper-panel--preview" aria-labelledby="paper-preview-title">
      <div className="paper-panel__heading">
        <span id="paper-preview-title">
          <ShieldCheck size={15} aria-hidden="true" />
          {t("paperExecution.sections.executionPreview")}
        </span>
        <StatusPill variant={paperOrder ? "success" : "warning"}>{statusLabel(t, paperOrder?.status ?? "disconnected")}</StatusPill>
      </div>
      <div className="execution-preview-list">
        {rows.map((row) => (
          <div className={`execution-preview-row execution-preview-row--${row.variant}`} key={row.label}>
            <span>{row.label}</span>
            <div>
              <strong>{row.value}</strong>
              <p>{row.meta}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="simulator-route">
        <FileText size={15} aria-hidden="true" />
        <span>{t("paperExecution.preview.noExchangeOrder")}</span>
      </div>
      <div className="paper-execute-lock">
        <button className="secondary-action" type="button" disabled={!canGenerateReviewReport || isGeneratingReviewReport} onClick={onGenerateReviewReport}>
          <FileText size={15} aria-hidden="true" />
          <span>{isGeneratingReviewReport ? t("paperExecution.preview.generatingReport") : t("paperExecution.preview.generateReviewReport")}</span>
        </button>
      </div>
    </section>
  );
}
