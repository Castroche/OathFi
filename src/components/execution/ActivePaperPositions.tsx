import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaperPosition } from "../../api/paperOrders";
import { riskValueLabel, sideLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type ActivePaperPositionsProps = {
  positions: PaperPosition[];
  isLoading: boolean;
  error?: string | null;
};

function numberCell(t: ReturnType<typeof useTranslation>["t"], value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : riskValueLabel(t, "unavailable");
}

export function ActivePaperPositions({ positions, isLoading, error }: ActivePaperPositionsProps) {
  const { t } = useTranslation();

  return (
    <section className="paper-panel paper-panel--positions" aria-labelledby="paper-positions-title">
      <div className="paper-panel__heading">
        <span id="paper-positions-title">
          <Layers size={15} aria-hidden="true" />
          {t("paperExecution.sections.activePositions")}
        </span>
        <StatusPill variant={error ? "danger" : positions.length ? "success" : "warning"}>
          {isLoading ? t("loadingStates.syncing") : error ? t("marketLive.status.error") : positions.length || t("paperExecution.empty.empty")}
        </StatusPill>
      </div>
      {error ? <div className="market-snapshot-empty">{error}</div> : null}
      {isLoading ? <div className="market-snapshot-empty">{t("loadingStates.syncing")}</div> : null}
      {!isLoading && !error && positions.length === 0 ? <div className="market-snapshot-empty">{t("paperExecution.empty.noPositions")}</div> : null}
      {positions.length ? (
        <div className="paper-position-table">
          <div className="paper-position-table__header">
            <span>{t("paperExecution.positions.symbol")}</span>
            <span>{t("paperExecution.positions.side")}</span>
            <span>{t("paperExecution.positions.quantity")}</span>
            <span>{t("paperExecution.positions.entryPrice")}</span>
            <span>{t("paperExecution.positions.markPrice")}</span>
            <span>{t("paperExecution.positions.pnl")}</span>
            <span>{t("paperExecution.positions.stopLoss")}</span>
            <span>{t("paperExecution.positions.takeProfit")}</span>
            <span>{t("paperExecution.positions.links")}</span>
          </div>
          {positions.map((position) => (
            <div className="paper-position-row" key={position.id}>
              <strong>{position.symbol}</strong>
              <span>{sideLabel(t, position.side)}</span>
              <span>{numberCell(t, position.quantity)}</span>
              <span>{numberCell(t, position.entry_price)}</span>
              <span>{numberCell(t, position.mark_price)}</span>
              <span>{numberCell(t, position.unrealized_pnl)}</span>
              <span>{numberCell(t, position.stop_loss)}</span>
              <span>{numberCell(t, position.take_profit)}</span>
              <span>
                {position.risk_check_id} / {position.hypothesis_id}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
