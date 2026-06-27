import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Star } from "lucide-react";
import { DEFAULT_SYMBOLS } from "../../services/htx/htxTypes";
import { fetchMarketSymbols, fetchMarketTickers, type CachedTicker } from "../../api/market";
import { useMarketDataStore } from "../../stores/marketDataStore";

type SymbolFilter = "USDT" | "BTC" | "HTX" | "FAV" | "RECENT";

const filters: SymbolFilter[] = ["USDT", "BTC", "HTX", "FAV", "RECENT"];

function formatPrice(ticker: CachedTicker | undefined, symbol: string) {
  if (!ticker) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: symbol === "HTX/USDT" ? 10 : ticker.last > 100 ? 2 : 6,
  }).format(ticker.last);
}

function formatCompact(value: number | undefined) {
  if (typeof value !== "number") {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(ticker: CachedTicker | undefined) {
  if (!ticker) {
    return "--";
  }
  return `${ticker.changePercent >= 0 ? "+" : ""}${ticker.changePercent.toFixed(2)}%`;
}

export const SymbolSelector = memo(function SymbolSelector() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SymbolFilter>("USDT");
  const [tickerMap, setTickerMap] = useState<Record<string, CachedTicker | undefined>>({});
  const [registrySource, setRegistrySource] = useState("loading");
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const symbols = useMarketDataStore((state) => state.availableSymbols);
  const favorites = useMarketDataStore((state) => state.favorites);
  const recentSymbols = useMarketDataStore((state) => state.recentSymbols);
  const setActiveSymbol = useMarketDataStore((state) => state.setActiveSymbol);

  useEffect(() => {
    const controller = new AbortController();
    fetchMarketSymbols(undefined, controller.signal)
      .then((data) => {
        useMarketDataStore.getState().setAvailableSymbols(data.symbols);
        setRegistrySource(data.source);
      })
      .catch(() => setRegistrySource("fallback"));
    fetchMarketTickers(undefined, controller.signal)
      .then((data) => {
        setTickerMap(Object.fromEntries(data.tickers.map((ticker) => [ticker.symbol, ticker])));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const filteredSymbols = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase().replace("-", "/");
    const compactQuery = normalizedQuery.replace("/", "");
    return symbols
      .filter((symbol) => {
        if (filter === "FAV" && !favorites.includes(symbol.symbol)) {
          return false;
        }
        if (filter === "RECENT" && !recentSymbols.includes(symbol.symbol)) {
          return false;
        }
        if (!normalizedQuery && filter !== "FAV" && filter !== "RECENT" && symbol.quote !== filter && symbol.base !== filter) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        const searchText = `${symbol.searchText ?? ""} ${symbol.symbol} ${symbol.base} ${symbol.quote} ${symbol.htxSymbol}`.toUpperCase();
        return (
          searchText.includes(normalizedQuery) ||
          searchText.includes(compactQuery) ||
          symbol.base.includes(normalizedQuery) ||
          symbol.quote.includes(normalizedQuery) ||
          symbol.htxSymbol.includes(normalizedQuery.toLowerCase().replace("/", ""))
        );
      })
      .sort((left, right) => {
        if (!normalizedQuery) {
          return 0;
        }
        const leftExact = left.symbol === normalizedQuery || left.htxSymbol.toUpperCase() === compactQuery;
        const rightExact = right.symbol === normalizedQuery || right.htxSymbol.toUpperCase() === compactQuery;
        if (leftExact !== rightExact) {
          return leftExact ? -1 : 1;
        }
        const leftBaseStarts = left.base.startsWith(normalizedQuery) || left.htxSymbol.toUpperCase().startsWith(compactQuery);
        const rightBaseStarts = right.base.startsWith(normalizedQuery) || right.htxSymbol.toUpperCase().startsWith(compactQuery);
        if (leftBaseStarts !== rightBaseStarts) {
          return leftBaseStarts ? -1 : 1;
        }
        const leftUsdt = left.quote === "USDT";
        const rightUsdt = right.quote === "USDT";
        if (leftUsdt !== rightUsdt) {
          return leftUsdt ? -1 : 1;
        }
        const volumeDelta = (tickerMap[right.symbol]?.quoteVolume ?? 0) - (tickerMap[left.symbol]?.quoteVolume ?? 0);
        if (volumeDelta !== 0) {
          return volumeDelta > 0 ? 1 : -1;
        }
        const leftFavorite = favorites.includes(left.symbol);
        const rightFavorite = favorites.includes(right.symbol);
        if (leftFavorite !== rightFavorite) {
          return leftFavorite ? -1 : 1;
        }
        const leftRecent = recentSymbols.includes(left.symbol);
        const rightRecent = recentSymbols.includes(right.symbol);
        if (leftRecent !== rightRecent) {
          return leftRecent ? -1 : 1;
        }
        const leftStarts = left.symbol.startsWith(normalizedQuery);
        const rightStarts = right.symbol.startsWith(normalizedQuery);
        if (leftStarts !== rightStarts) {
          return leftStarts ? -1 : 1;
        }
        return left.symbol.localeCompare(right.symbol);
      })
      .slice(0, 80);
  }, [favorites, filter, query, recentSymbols, symbols, tickerMap]);

  const selectSymbol = (symbol: string) => {
    setActiveSymbol(symbol);
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", symbol);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };

  return (
    <section className="symbol-selector" aria-label={t("marketLive.selector.aria")}>
      <div className="symbol-selector__search">
        <Search size={14} aria-hidden="true" />
        <input
          value={query}
          placeholder={t("marketLive.selector.searchPlaceholder")}
          aria-label={t("marketLive.selector.searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="symbol-selector__defaults" aria-label={t("marketLive.selector.defaultSymbols")}>
        {DEFAULT_SYMBOLS.map((symbol) => (
          <button
            className={symbol === activeSymbol ? "is-active" : undefined}
            key={symbol}
            type="button"
            onClick={() => selectSymbol(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="symbol-selector__filters" aria-label={t("marketLive.selector.filters")}>
        {filters.map((filterName) => (
          <button
            className={filterName === filter ? "is-active" : undefined}
            key={filterName}
            type="button"
            onClick={() => setFilter(filterName)}
          >
            {filterName}
          </button>
        ))}
      </div>

      <div className="symbol-selector__list" aria-label={t("marketLive.selector.symbolList")}>
        {filteredSymbols.map((symbol) => (
          <button
            className={symbol.symbol === activeSymbol ? "is-active" : undefined}
            key={symbol.symbol}
            type="button"
            onClick={() => selectSymbol(symbol.symbol)}
          >
            <span>
              <strong>{symbol.symbol}</strong>
              <em>
                {formatPrice(tickerMap[symbol.symbol], symbol.symbol)} · {formatChange(tickerMap[symbol.symbol])} · {formatCompact(tickerMap[symbol.symbol]?.quoteVolume)} · {tickerMap[symbol.symbol]?.source ?? registrySource}
              </em>
            </span>
            {favorites.includes(symbol.symbol) ? <Star size={13} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
});
