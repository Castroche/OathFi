import { Play, RefreshCcw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PaperOrder } from "../../api/paperOrders";
import type { RiskCheck } from "../../api/risk";
import { StatusPill } from "../common/StatusPill";

type TicketDraft = {
  symbol: string;
  side: string;
  order_type: string;
  price: string;
  quantity: string;
  stop_loss: string;
  take_profit: string;
  risk_amount: string;
  mode: string;
};

type OrderTicketProps = {
  paperOrder?: PaperOrder;
  riskCheck?: RiskCheck | Partial<RiskCheck> | null;
  isExecuting: boolean;
  isCancelling: boolean;
  disabledReason?: string;
  onExecute: () => void;
  onCancel: () => void;
};

function toDraft(order?: PaperOrder): TicketDraft {
  return {
    symbol: order?.symbol ?? "",
    side: order?.side ?? "",
    order_type: order?.order_type ?? "",
    price: order?.price?.toString() ?? "",
    quantity: order?.quantity?.toString() ?? "",
    stop_loss: order?.stop_loss?.toString() ?? "",
    take_profit: order?.take_profit?.toString() ?? "",
    risk_amount: order?.risk_amount?.toString() ?? "",
    mode: order?.mode ?? order?.execution_mode ?? "paper",
  };
}

function riskBlocks(riskCheck?: RiskCheck | Partial<RiskCheck> | null) {
  const decision = String(riskCheck?.decision ?? riskCheck?.status ?? "").toUpperCase();
  return decision === "REJECTED" || decision === "BLOCK";
}

export function OrderTicket({ paperOrder, riskCheck, isExecuting, isCancelling, disabledReason, onExecute, onCancel }: OrderTicketProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TicketDraft>(() => toDraft(paperOrder));

  useEffect(() => {
    setDraft(toDraft(paperOrder));
  }, [paperOrder]);

  const original = useMemo(() => toDraft(paperOrder), [paperOrder]);
  const stale = useMemo(
    () => ["price", "quantity", "stop_loss", "take_profit"].some((key) => draft[key as keyof TicketDraft] !== original[key as keyof TicketDraft]),
    [draft, original],
  );
  const locked = !paperOrder || paperOrder.status !== "draft";
  const missingRisk = !paperOrder?.risk_check_id || !riskCheck;
  const blocked = riskBlocks(riskCheck);
  const executeDisabled = locked || stale || missingRisk || blocked || isExecuting || Boolean(disabledReason);
  const canCancel = Boolean(paperOrder && ["draft", "open"].includes(paperOrder.status) && !isCancelling);

  const update = (key: keyof TicketDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="paper-panel paper-panel--ticket" aria-labelledby="paper-ticket-title">
      <div className="paper-panel__heading">
        <span id="paper-ticket-title">{t("paperExecution.sections.orderTicket")}</span>
        <StatusPill variant={locked ? "warning" : "success"}>{locked ? t("paperExecution.ticket.locked") : t("paperExecution.ticket.editable")}</StatusPill>
      </div>
      <div className="paper-ticket-list">
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.symbol")}</span>
          <input value={draft.symbol} disabled onChange={(event) => update("symbol", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.side")}</span>
          <input value={draft.side} disabled={locked} onChange={(event) => update("side", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.orderType")}</span>
          <select value={draft.order_type} disabled={locked} onChange={(event) => update("order_type", event.target.value)}>
            <option value="limit">{t("paperExecution.values.limit")}</option>
            <option value="market">{t("paperExecution.values.market")}</option>
          </select>
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.entryPrice")}</span>
          <input value={draft.price} inputMode="decimal" disabled={locked} onChange={(event) => update("price", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.stop")}</span>
          <input value={draft.stop_loss} inputMode="decimal" disabled={locked} onChange={(event) => update("stop_loss", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.takeProfit")}</span>
          <input value={draft.take_profit} inputMode="decimal" disabled={locked} onChange={(event) => update("take_profit", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.size")}</span>
          <input value={draft.quantity} inputMode="decimal" disabled={locked} onChange={(event) => update("quantity", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.risk")}</span>
          <input value={draft.risk_amount} disabled onChange={(event) => update("risk_amount", event.target.value)} />
        </label>
        <label className="paper-ticket-row">
          <span>{t("paperExecution.ticket.mode")}</span>
          <input value={draft.mode} disabled onChange={(event) => update("mode", event.target.value)} />
        </label>
      </div>
      <div className="paper-execute-lock">
        {stale ? (
          <p>
            <RefreshCcw size={13} aria-hidden="true" /> {t("paperExecution.ticket.stale")}
          </p>
        ) : null}
        {blocked || missingRisk || disabledReason ? <p>{disabledReason ?? t("paperExecution.ticket.riskRequired")}</p> : null}
        <button className="primary-action" type="button" disabled={executeDisabled} onClick={onExecute}>
          <Play size={15} aria-hidden="true" />
          <span>{isExecuting ? t("loadingStates.executing", "Executing...") : t("paperExecution.ticket.execute")}</span>
        </button>
        <button className="secondary-action" type="button" disabled={!canCancel} onClick={onCancel}>
          <XCircle size={15} aria-hidden="true" />
          <span>{isCancelling ? t("loadingStates.cancelling", "Cancelling...") : t("paperExecution.ticket.cancel")}</span>
        </button>
      </div>
    </section>
  );
}
