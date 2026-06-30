import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaperExecutionLog } from "../../api/paperOrders";
import { actionTypeLabel, paperLogMessage, riskValueLabel, statusLabel } from "../../lib/displayLabels";
import { StatusPill } from "../common/StatusPill";

type ExecutionLogTableProps = {
  logs: PaperExecutionLog[];
  isLoading: boolean;
  error?: string | null;
};

function logVariant(status: string) {
  const normalized = status.toLowerCase();
  if (["rejected", "failed", "blocked"].includes(normalized)) return "danger";
  if (["open", "draft", "cancelled"].includes(normalized)) return "warning";
  return "info";
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ExecutionLogTable({ logs, isLoading, error }: ExecutionLogTableProps) {
  const { t } = useTranslation();

  return (
    <section className="paper-panel paper-panel--log" aria-labelledby="paper-log-title">
      <div className="paper-panel__heading">
        <span id="paper-log-title">
          <Clock3 size={15} aria-hidden="true" />
          {t("paperExecution.sections.executionLog")}
        </span>
        <StatusPill variant={error ? "danger" : logs.length ? "success" : "warning"}>
          {isLoading ? t("loadingStates.syncing") : error ? t("marketLive.status.error") : logs.length || t("paperExecution.empty.empty")}
        </StatusPill>
      </div>
      {error ? <div className="market-snapshot-empty">{error}</div> : null}
      {isLoading ? <div className="market-snapshot-empty">{t("loadingStates.syncing")}</div> : null}
      {!isLoading && !error && logs.length === 0 ? <div className="market-snapshot-empty">{t("paperExecution.empty.noLogs")}</div> : null}
      {logs.length ? (
        <div className="execution-log-list">
          {logs.map((log) => {
            const variant = logVariant(log.status);
            const Icon = variant === "danger" ? ShieldAlert : CheckCircle2;
            return (
              <article className={`execution-log-row execution-log-row--${variant}`} key={log.id}>
                <time dateTime={log.created_at}>{timeLabel(log.created_at)}</time>
                <Icon size={16} aria-hidden="true" />
                <div>
                  <h3>
                    {actionTypeLabel(t, log.event_type)} / {statusLabel(t, log.status)}
                  </h3>
                  <p>{paperLogMessage(t, log)}</p>
                  <p>
                    {t("paperExecution.log.order")}: {log.paper_order_id ?? riskValueLabel(t, "unavailable")} / {t("paperExecution.log.risk")}: {log.risk_check_id ?? riskValueLabel(t, "unavailable")} /{" "}
                    {t("paperExecution.log.hypothesis")}: {log.hypothesis_id ?? riskValueLabel(t, "unavailable")}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
