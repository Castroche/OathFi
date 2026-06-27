import type { NewsCategory, NewsFilter, NewsRiskContext, NormalizedNewsItem } from "./newsTypes";

export const NEWS_VISIBLE_LIMIT = 12;

export const neutralNewsRiskContext: NewsRiskContext = {
  newsRisk: 0,
  newsSupport: 0,
  macroRisk: 0,
  onChainRisk: 0,
  hardBlockEvent: false,
  hardBlockReasons: [],
  warnings: [],
  relatedSymbols: [],
};

function maxMetric(items: NormalizedNewsItem[], key: "newsRisk" | "newsSupport" | "macroRisk" | "onChainRisk") {
  return items.reduce((max, item) => Math.max(max, item[key]), 0);
}

export function filterNewsItems(items: NormalizedNewsItem[], filter: NewsFilter, symbol?: string) {
  const normalizedSymbol = symbol?.toUpperCase();
  return items
    .filter((item) => filter === "all" || item.category === filter)
    .filter((item) => !normalizedSymbol || item.relatedSymbols.length === 0 || item.relatedSymbols.includes(normalizedSymbol))
    .slice(0, NEWS_VISIBLE_LIMIT);
}

export function buildNewsRiskContext(items: NormalizedNewsItem[] = [], symbol?: string): NewsRiskContext {
  const scopedItems = filterNewsItems(items, "all", symbol);
  if (scopedItems.length === 0) {
    return neutralNewsRiskContext;
  }

  const warnings = scopedItems
    .filter((item) => item.hardBlock || item.newsRisk >= 0.55 || item.onChainRisk >= 0.55 || item.macroRisk >= 0.45)
    .slice(0, 6);

  return {
    newsRisk: maxMetric(scopedItems, "newsRisk"),
    newsSupport: maxMetric(scopedItems, "newsSupport"),
    macroRisk: maxMetric(scopedItems, "macroRisk"),
    onChainRisk: maxMetric(scopedItems, "onChainRisk"),
    hardBlockEvent: scopedItems.some((item) => item.hardBlock),
    hardBlockReasons: scopedItems
      .filter((item) => item.hardBlock && item.hardBlockReason)
      .map((item) => item.hardBlockReason as string),
    warnings,
    relatedSymbols: Array.from(new Set(scopedItems.flatMap((item) => item.relatedSymbols))),
  };
}

export function getCategoryCount(items: NormalizedNewsItem[], category: NewsCategory) {
  return items.filter((item) => item.category === category).length;
}

export function getCategoryRisk(items: NormalizedNewsItem[], category: NewsCategory) {
  return maxMetric(
    items.filter((item) => item.category === category),
    category === "macro" ? "macroRisk" : category === "onchain" ? "onChainRisk" : "newsRisk",
  );
}
