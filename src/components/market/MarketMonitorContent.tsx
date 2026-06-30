import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../../api/settings";
import { markRender } from "../../lib/perfDiagnostics";
import { SymbolSelector } from "./SymbolSelector";
import { ProKlineTerminal } from "./ProKlineTerminal";
import { LiveOrderBook } from "./LiveOrderBook";
import { LiveTradesStream } from "./LiveTradesStream";
import { ResizableMarketWorkspace } from "./ResizableMarketWorkspace";
import { MarketHeaderSummary } from "./MarketHeaderSummary";
import { IndicatorPanel } from "./IndicatorPanel";
import { MarketEventTimeline } from "./MarketEventTimeline";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { MarketTopTickerBar } from "./MarketTopTickerBar";
import { StatusPill } from "../common/StatusPill";

type MarketMonitorContentProps = {
  onGenerateHypothesis?: () => void;
  isGeneratingHypothesis?: boolean;
};

export function MarketMonitorContent({ onGenerateHypothesis, isGeneratingHypothesis = false }: MarketMonitorContentProps) {
  markRender("MarketMonitorContent");
  const { t } = useTranslation();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });
  const settings = settingsQuery.data;

  return (
    <section className="market-monitor" aria-label={t("marketMonitor.aria")}>
      <MarketTopTickerBar />
      <div className="market-settings-strip" aria-label={t("settings.sections.dataSource")}>
        <StatusPill variant="success">{settings?.primary_data_source ?? "HTX"}</StatusPill>
        <StatusPill variant="info">{settings?.connection_type ?? "Hybrid"}</StatusPill>
        <StatusPill variant={settings?.fallback_method === "None" ? "warning" : "info"}>{settings?.fallback_method ?? "REST fallback"}</StatusPill>
        <StatusPill variant={settings?.latency_monitor_enabled === false ? "warning" : "success"}>
          {settings?.latency_monitor_enabled === false ? t("status.disabled") : `${settings?.latency_warning_ms ?? 800}/${settings?.latency_critical_ms ?? 2000} ms`}
        </StatusPill>
      </div>
      <MarketHeaderSummary onGenerateHypothesis={onGenerateHypothesis} isGeneratingHypothesis={isGeneratingHypothesis} />

      <div className="market-monitor__live-layout">
        <SymbolSelector />
        <ResizableMarketWorkspace
          chart={<ProKlineTerminal />}
          orderBook={<LiveOrderBook />}
          trades={<LiveTradesStream />}
          indicators={<IndicatorPanel />}
          events={<MarketEventTimeline />}
          diagnostics={<DiagnosticsPanel />}
        />
      </div>
    </section>
  );
}
