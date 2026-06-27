import { create } from "zustand";
import { fetchNewsLatest } from "../api/news";
import { newsSourceAdapters } from "../services/news/newsAdapters";
import { normalizeNewsDrafts } from "../services/news/newsNormalizer";
import { buildNewsRiskContext, filterNewsItems, getCategoryRisk, neutralNewsRiskContext } from "../services/news/newsSelectors";
import type { NewsCategory, NewsFilter, NewsRiskContext, NormalizedNewsItem } from "../services/news/newsTypes";

type NewsIntelligenceState = {
  items: NormalizedNewsItem[];
  filter: NewsFilter;
  sourceAdapters: typeof newsSourceAdapters;
  lastUpdated: string;
  setFilter: (filter: NewsFilter) => void;
  getFilteredItems: (filter?: NewsFilter, symbol?: string) => NormalizedNewsItem[];
  getRiskContext: (symbol?: string) => NewsRiskContext;
  getCategoryRisk: (category: NewsCategory) => number;
  resetToNeutral: () => void;
  loadNews: (language: string) => Promise<void>;
};

export const useNewsIntelligenceStore = create<NewsIntelligenceState>()((set, get) => ({
  items: [],
  filter: "all",
  sourceAdapters: newsSourceAdapters,
  lastUpdated: new Date().toISOString(),
  setFilter: (filter) => set({ filter }),
  getFilteredItems: (filter, symbol) => filterNewsItems(get().items, filter ?? get().filter, symbol),
  getRiskContext: (symbol) => buildNewsRiskContext(get().items, symbol),
  getCategoryRisk: (category) => getCategoryRisk(get().items, category),
  resetToNeutral: () =>
    set({
      items: [],
      filter: "all",
      lastUpdated: new Date().toISOString(),
    }),
  loadNews: async (language) => {
    const now = Date.now();
    try {
      const drafts = await fetchNewsLatest(language, 12);
      set({
        items: normalizeNewsDrafts(drafts, now),
        filter: "all",
        lastUpdated: new Date(now).toISOString(),
      });
    } catch {
      set({
        items: [],
        lastUpdated: new Date(now).toISOString(),
      });
    }
  },
}));

export function getNeutralNewsRiskContext() {
  return neutralNewsRiskContext;
}
