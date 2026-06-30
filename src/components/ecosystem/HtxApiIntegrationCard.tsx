import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchHtxEcosystemStatus, type EcosystemStatus } from "../../api/ecosystem";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

const checkOrder = ["ticker_data", "kline_data", "order_book", "trades"] as const;

function statusVariant(status: EcosystemStatus): StatusPillVariant {
  if (status === "connected" || status === "read_only") return "success";
  if (status === "planned" || status === "roadmap" || status === "degraded") return "warning";
  return "danger";
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function HtxApiIntegrationCard() {
  const { t } = useTranslation();
  const statusQuery = useQuery({
    queryKey: ["ecosystem", "htx-status"],
    queryFn: ({ signal }) => fetchHtxEcosystemStatus(signal),
    refetchInterval: 30_000,
  });
  const data = statusQuery.data;
  const checks = data?.checks ?? [];

  return (
    <section className="ecosystem-panel ecosystem-panel--api" aria-labelledby="ecosystem-htx-api">
      <div className="ecosystem-panel__heading">
        <span id="ecosystem-htx-api">
          <Database size={15} aria-hidden="true" />
          {t("htxEcosystem.sections.htxApi")}
        </span>
        <button className="secondary-action secondary-action--compact" type="button" disabled={statusQuery.isFetching} onClick={() => void statusQuery.refetch()}>
          <RefreshCw size={13} aria-hidden="true" />
          <span>{statusQuery.isFetching ? t("loadingStates.syncing") : t("htxEcosystem.actions.refresh")}</span>
        </button>
      </div>

      {statusQuery.isLoading ? (
        <div className="ecosystem-empty">{t("htxEcosystem.loading.htx")}</div>
      ) : statusQuery.error ? (
        <div className="ecosystem-empty ecosystem-empty--danger">{statusQuery.error instanceof Error ? statusQuery.error.message : t("errors.generic")}</div>
      ) : data ? (
        <>
          <div className="ecosystem-status-grid">
            {checkOrder.map((id) => {
              const check = checks.find((item) => item.id === id);
              const status = check?.status ?? "disconnected";
              return (
                <article className="ecosystem-status-row" key={id}>
                  <div>
                    <span>{t(`htxEcosystem.htxApi.${id}`)}</span>
                    <strong>{check?.source ?? "htx_rest"}</strong>
                    <p>{check?.latency_ms ? `${check.latency_ms} ms` : check?.error ?? t("htxEcosystem.meta.healthChecked")}</p>
                  </div>
                  <StatusPill variant={statusVariant(status)}>{t(`htxEcosystem.status.${status}`)}</StatusPill>
                </article>
              );
            })}
          </div>

          <div className="ecosystem-fact-strip">
            <span>
              {t("htxEcosystem.htxApi.accountReadOnly")}
              <StatusPill variant="warning">{t(`htxEcosystem.status.${data.account_read_only_status}`)}</StatusPill>
            </span>
            <span>
              {t("htxEcosystem.htxApi.liveTrading")}
              <StatusPill variant="danger">{t(`htxEcosystem.status.${data.live_trading_status}`)}</StatusPill>
            </span>
            <span>
              {t("htxEcosystem.htxApi.apiEnvironment")}
              <strong>{t(`htxEcosystem.environment.${data.api_environment}`)}</strong>
            </span>
            <span>
              {t("htxEcosystem.htxApi.lastSync")}
              <time>{formatDate(data.last_sync)}</time>
            </span>
          </div>
        </>
      ) : (
        <div className="ecosystem-empty">{t("emptyStates.generic")}</div>
      )}
    </section>
  );
}
