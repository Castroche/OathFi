import { useEffect, useState } from "react";
import { RadioTower } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_BACKEND_SYMBOLS,
  cachedTickerToMarketTicker,
  fetchMarketSymbols,
  fetchMarketTickers,
} from "../../api/market";
import { useMarketDataStore } from "../../stores/marketDataStore";
import type { MarketTicker } from "../../services/htx/htxTypes";

const WATCHLIST_SYMBOLS = DEFAULT_BACKEND_SYMBOLS.map((symbol) => symbol.symbol);

function formatPrice(ticker: MarketTicker | undefined, fallback: string) {
  if (!ticker) {
    return fallback;
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: ticker.last > 100 ? 2 : 4,
    maximumFractionDigits: ticker.last > 100 ? 2 : 8,
  }).format(ticker.last);
}

function formatChange(ticker: MarketTicker | undefined, fallback: string) {
  if (!ticker) {
    return fallback;
  }
  return `${ticker.changePct >= 0 ? "+" : ""}${ticker.changePct.toFixed(2)}%`;
}

function tickerInitial(symbol: string) {
  return symbol.split("/")[0]?.slice(0, 3) ?? symbol.slice(0, 3);
}

function displaySource(source: string | undefined) {
  if (source === "htx_ws") {
    return "live_ws_htx";
  }
  if (source === "htx_rest") {
    return "htx_rest_fallback";
  }
  return source ?? "htx_rest_fallback";
}

export function MarketTopTickerBar() {
  const { t } = useTranslation();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTicker = useMarketDataStore((state) => state.ticker);
  const topTickers = useMarketDataStore((state) => state.topTickers);
  const symbolStatuses = useMarketDataStore((state) => state.symbolStatuses);
  const [listedSymbols, setListedSymbols] = useState<Set<string> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const refreshTickers = () => {
      fetchMarketTickers(WATCHLIST_SYMBOLS, controller.signal)
        .then((data) => {
          data.tickers.forEach((item) => {
            const ticker = cachedTickerToMarketTicker(item);
            useMarketDataStore.getState().applyTopTicker(ticker, {
              status: "degraded",
              dataSource: "htx_rest_ticker_cache",
              lastUpdated: Date.now(),
              latencyMs: null,
              error: null,
            });
          });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            WATCHLIST_SYMBOLS.forEach((symbol) => {
              useMarketDataStore.getState().applyTopTickerFallback(symbol, error instanceof Error ? error.message : "Ticker refresh failed");
            });
          }
        });
    };

    fetchMarketSymbols(undefined, controller.signal)
      .then((data) => {
        useMarketDataStore.getState().setAvailableSymbols(data.symbols);
        setListedSymbols(new Set(data.symbols.map((symbol) => symbol.symbol)));
      })
      .catch(() => undefined);
    refreshTickers();
    const refreshTimer = window.setInterval(refreshTickers, 5_000);

    return () => {
      window.clearInterval(refreshTimer);
      controller.abort();
    };
  }, []);

  return (
    <section className="market-top-ticker-bar" aria-label={t("marketLive.tickerBar.aria")}>
      {WATCHLIST_SYMBOLS.map((symbol) => {
        const liveTicker = symbol === activeSymbol && activeTicker?.symbol === symbol ? activeTicker : null;
        const ticker = liveTicker ?? topTickers[symbol];
        const status = symbolStatuses[symbol];
        const source = displaySource(status?.dataSource ?? ticker?.source);
        const isListed = listedSymbols ? listedSymbols.has(symbol) : status?.error !== "Not Listed";
        const isLive = symbol === activeSymbol && source === "live_ws_htx";
        const isPositive = (ticker?.changePct ?? 0) >= 0;
        return (
          <article className={`market-ticker-card${isLive ? " is-live" : ""}`} key={symbol}>
            <span className="market-ticker-card__icon">{tickerInitial(symbol)}</span>
            <div>
              <strong>{symbol}</strong>
              <span className="market-ticker-card__source">
                <i className={isLive ? "is-live" : ""} />
                {source}
              </span>
            </div>
            <div className="market-ticker-card__price">
              <strong>{formatPrice(ticker, isListed ? t("marketLive.status.loading") : t("marketLive.status.notListed"))}</strong>
              <em className={isPositive ? "is-positive" : "is-negative"}>{isListed ? formatChange(ticker, "--") : t("marketLive.status.notListed")}</em>
            </div>
            <RadioTower size={15} aria-hidden="true" />
          </article>
        );
      })}
    </section>
  );
}
