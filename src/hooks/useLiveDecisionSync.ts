import { useEffect } from "react";
import { useLiveDecisionStore } from "../stores/liveDecisionStore";
import { useMarketDataStore } from "../stores/marketDataStore";
import { useNewsIntelligenceStore } from "../stores/newsIntelligenceStore";

export function useLiveDecisionSync() {
  useEffect(() => {
    let timeoutId: number | null = null;

    const refresh = () => {
      const market = useMarketDataStore.getState();
      const news = useNewsIntelligenceStore.getState();
      useLiveDecisionStore.getState().refreshDecision({
        symbol: market.activeSymbol,
        ticker: market.ticker,
        klines: market.klines,
        orderBook: market.orderBook,
        trades: market.trades,
        newsRiskContext: news.getRiskContext(market.activeSymbol),
        referencedNews: news.getFilteredItems("all", market.activeSymbol),
        dataSource: market.dataSource,
        connectionStatus: market.connectionStatus,
        lastUpdated: market.lastUpdated,
        latencyMs: market.latencyMs,
      });
    };

    const scheduleRefresh = () => {
      if (timeoutId !== null) {
        return;
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        refresh();
      }, 900);
    };

    refresh();
    const unsubscribeMarket = useMarketDataStore.subscribe(scheduleRefresh);
    const unsubscribeNews = useNewsIntelligenceStore.subscribe(scheduleRefresh);

    return () => {
      unsubscribeMarket();
      unsubscribeNews();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);
}
