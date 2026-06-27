import { useTranslation } from "react-i18next";
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
import { useMarketSocket } from "../../hooks/useMarketSocket";

type MarketMonitorContentProps = {
  onGenerateHypothesis?: () => void;
  isGeneratingHypothesis?: boolean;
};

export function MarketMonitorContent({ onGenerateHypothesis, isGeneratingHypothesis = false }: MarketMonitorContentProps) {
  markRender("MarketMonitorContent");
  const { t } = useTranslation();
  useMarketSocket();

  return (
    <section className="market-monitor" aria-label={t("marketMonitor.aria")}>
      <MarketTopTickerBar />
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
