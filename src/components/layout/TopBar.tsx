import { useEffect } from "react";
import { CheckCircle2, DatabaseZap, Globe2, ShieldCheck, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cachedTickerToMarketTicker, fetchMarketTickers } from "../../api/market";
import { StatusPill } from "../common/StatusPill";
import { useAppStore, type Locale } from "../../stores/appStore";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { DEFAULT_SYMBOLS, type MarketTicker, type SymbolLiveStatus } from "../../services/htx/htxTypes";
import { markRender } from "../../lib/perfDiagnostics";

function formatTickerPrice(value: number | undefined, symbol: string, fallback: string) {
  if (typeof value !== "number") {
    return fallback;
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: symbol === "HTX/USDT" ? 10 : value > 100 ? 2 : 6,
  }).format(value);
}

function statusKey(status: string) {
  if (status === "live") {
    return "marketLive.status.live";
  }
  if (status === "stale") {
    return "marketLive.status.stale";
  }
  if (status === "degraded") {
    return "topBar.lightweightMarket";
  }
  if (status === "mock") {
    return "marketLive.status.mock";
  }
  if (status === "disconnected") {
    return "marketLive.status.disconnected";
  }
  if (status === "fallback") {
    return "marketLive.status.fallback";
  }
  if (status === "reconnecting") {
    return "marketLive.status.reconnecting";
  }
  if (status === "error") {
    return "marketLive.status.error";
  }
  return "marketLive.status.loading";
}

function formatTickerChange(ticker: MarketTicker | undefined, status: SymbolLiveStatus | undefined, t: ReturnType<typeof useTranslation>["t"]) {
  if (!ticker) {
    return t(statusKey(status ?? "loading"));
  }
  return `${ticker.changePct >= 0 ? "+" : ""}${ticker.changePct.toFixed(2)}%`;
}

export function TopBar() {
  markRender("TopBar");
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const ticker = useMarketDataStore((state) => state.ticker);
  const topTickers = useMarketDataStore((state) => state.topTickers);
  const symbolStatuses = useMarketDataStore((state) => state.symbolStatuses);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const availableSymbols = useMarketDataStore((state) => state.availableSymbols);
  const activeSubscriptions = useMarketDataStore((state) => state.activeSubscriptions);
  const setActiveSymbol = useMarketDataStore((state) => state.setActiveSymbol);

  useEffect(() => {
    const controller = new AbortController();

    const refreshTickers = () => {
      fetchMarketTickers([...DEFAULT_SYMBOLS], controller.signal)
        .then((data) => {
          data.tickers.forEach((item) => {
            const state = useMarketDataStore.getState();
            if (item.symbol === state.activeSymbol && state.ticker?.source === "live_ws_htx") {
              return;
            }
            state.applyTopTicker(cachedTickerToMarketTicker(item), {
              status: "degraded",
              dataSource: "htx_rest_ticker_cache",
              lastUpdated: Date.now(),
              latencyMs: null,
              error: null,
            });
          });
        })
        .catch(() => undefined);
    };

    refreshTickers();
    const timer = window.setInterval(refreshTickers, 5_000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, []);

  const selectLanguage = (nextLanguage: Locale) => {
    setLanguage(nextLanguage);
  };

  const tickerSymbols = [activeSymbol, ...DEFAULT_SYMBOLS.filter((symbol) => symbol !== activeSymbol)];
  const activeStreamSource = Object.keys(activeSubscriptions).length > 0 ? "live_ws_htx" : dataSource;
  const tickerChips = tickerSymbols.map((symbol) => {
    const symbolStatus = symbolStatuses[symbol];
    const activeTicker = symbol === activeSymbol && ticker?.symbol === symbol ? ticker : null;
    const symbolTicker = activeTicker ?? topTickers[symbol];
    const fallbackText =
      symbolStatus?.status === "error"
        ? t("marketLive.status.error")
        : symbolStatus?.status === "fallback"
          ? t("marketLive.status.fallback")
          : t("marketLive.status.loading");
    return {
      symbol,
      price: formatTickerPrice(symbolTicker?.last, symbol, fallbackText),
      change: `${formatTickerChange(symbolTicker, symbolStatus?.status, t)} - ${t(statusKey(symbolStatus?.status ?? "loading"))}`,
      direction: symbolTicker && symbolTicker.changePct < 0 ? "down" : "up",
    };
  });

  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          OF
        </div>
        <div>
          <div className="brand-name">{t("brand.name")}</div>
          <div className="brand-subtitle">{t("brand.subtitle")}</div>
        </div>
      </div>

      <div className="ticker-strip" aria-label={t("topBar.tickerStrip")}>
        {tickerChips.map((ticker) => (
          <button
            className={`ticker-chip ticker-chip--${ticker.direction}`}
            key={ticker.symbol}
            type="button"
            onClick={() => setActiveSymbol(ticker.symbol)}
          >
            <span>{ticker.symbol}</span>
            <strong>{ticker.price}</strong>
            <em>{ticker.change}</em>
          </button>
        ))}
      </div>

      <div className="top-bar__status">
        <StatusPill variant={activeStreamSource === "live_ws_htx" || connectionStatus === "live" ? "success" : connectionStatus === "fallback" ? "warning" : "info"}>
          <Wifi size={13} aria-hidden="true" />
          {t("topBar.activeStream", { source: activeStreamSource })}
        </StatusPill>
        <StatusPill variant={Object.keys(topTickers).length > 0 ? "success" : "info"}>
          <DatabaseZap size={13} aria-hidden="true" />
          {t("topBar.watchlistTickers", { source: "htx_rest_ticker_cache" })}
        </StatusPill>
        <StatusPill variant={availableSymbols.length >= DEFAULT_SYMBOLS.length ? "success" : "info"}>
          <ShieldCheck size={13} aria-hidden="true" />
          {t("topBar.symbolRegistry", { state: availableSymbols.length >= DEFAULT_SYMBOLS.length ? "ready" : "loading" })}
        </StatusPill>
        <StatusPill variant="info">
          <CheckCircle2 size={13} aria-hidden="true" />
          {t("topBar.publicMarketData", { state: connectionStatus === "error" ? "degraded" : "connected" })}
        </StatusPill>
      </div>

      <div className="language-switcher" aria-label={t("language.switcher")}>
        <Globe2 size={15} aria-hidden="true" />
        <button
          className={language === "en" ? "is-active" : undefined}
          type="button"
          onClick={() => selectLanguage("en")}
        >
          {t("language.englishShort")}
        </button>
        <button
          className={language === "zh-CN" ? "is-active" : undefined}
          type="button"
          onClick={() => selectLanguage("zh-CN")}
        >
          {t("language.chineseShort")}
        </button>
      </div>
    </header>
  );
}
