import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sourceLabel, statusLabel } from "../../lib/displayLabels";
import { useMarketDataStore } from "../../stores/marketDataStore";
import type { StreamDiagnostic, StreamName } from "../../services/htx/htxTypes";
import { StatusPill } from "../common/StatusPill";

function formatMetric(value: number | null, suffix = "ms") {
  if (typeof value !== "number") {
    return "--";
  }
  return `${Math.round(value)} ${suffix}`.trim();
}

function streamStatusVariant(status: StreamDiagnostic["status"]) {
  if (status === "live") return "success";
  if (status === "error" || status === "stale") return "danger";
  if (status === "fallback") return "warning";
  return "info";
}

export function DiagnosticsPanel() {
  const { t } = useTranslation();
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const streamDiagnostics = useMarketDataStore((state) => state.streamDiagnostics);
  const reconnectCount = useMarketDataStore((state) => state.reconnectCount);

  const lastMessageAgeMs = useMemo(() => {
    const ages = Object.values(streamDiagnostics)
      .map((diagnostic) => diagnostic.lastMessageAgeMs)
      .filter((age): age is number => typeof age === "number");
    return ages.length > 0 ? Math.max(...ages) : null;
  }, [streamDiagnostics]);

  const streamRows: Array<[string, StreamName]> = [
    ["tickerStreamStatus", "ticker"],
    ["klineStreamStatus", "kline"],
    ["depthStreamStatus", "depth"],
    ["tradeStreamStatus", "trade"],
  ];

  return (
    <section className="market-diagnostics-panel" aria-label={t("marketLive.diagnostics.aria")}>
      <div className="market-diagnostics-panel__grid">
        {streamRows.map(([label, stream]) => {
          const diagnostic = streamDiagnostics[stream];
          return (
            <article className="market-diagnostic-tile" key={stream}>
              <span>{t(`marketLive.diagnostics.${label}`, label)}</span>
              <StatusPill variant={streamStatusVariant(diagnostic.status)}>{statusLabel(t, diagnostic.status)}</StatusPill>
              <small>{diagnostic.subscribedTopic ?? "--"}</small>
            </article>
          );
        })}
        <article className="market-diagnostic-tile">
          <span>{t("marketLive.diagnostics.lastMessageAgeMs", "lastMessageAgeMs")}</span>
          <strong>{formatMetric(lastMessageAgeMs)}</strong>
          <small>{t("marketLive.diagnostics.maxStreamAge")}</small>
        </article>
        <article className="market-diagnostic-tile">
          <span>{t("marketLive.header.source")}</span>
          <strong>{sourceLabel(t, dataSource)}</strong>
          <small>{statusLabel(t, connectionStatus)}</small>
        </article>
        <article className="market-diagnostic-tile">
          <span>{t("marketLive.diagnostics.reconnectCount", "reconnectCount")}</span>
          <strong>{formatMetric(reconnectCount, "")}</strong>
          <small>{t("marketLive.diagnostics.staleDrops")}</small>
        </article>
        <article className="market-diagnostic-tile">
          <span>{t("marketLive.diagnostics.chartPatch", "chartPatch")}</span>
          <StatusPill variant={streamStatusVariant(streamDiagnostics.chartPatch.status)}>{statusLabel(t, streamDiagnostics.chartPatch.status)}</StatusPill>
          <small>{formatMetric(streamDiagnostics.chartPatch.lastMessageAgeMs)}</small>
        </article>
      </div>
    </section>
  );
}
