import { Newspaper } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import { buildNewsRiskContext, getCategoryCount } from "../../services/news/newsSelectors";
import type { NewsFilter } from "../../services/news/newsTypes";
import { useNewsIntelligenceStore } from "../../stores/newsIntelligenceStore";
import { NewsFeedList } from "./NewsFeedList";
import { NewsFilterTabs } from "./NewsFilterTabs";
import { NewsImpactSummary } from "./NewsImpactSummary";

type NewsIntelligencePanelProps = {
  currentSymbol?: string;
  compact?: boolean;
};

export const NewsIntelligencePanel = memo(function NewsIntelligencePanel({ currentSymbol, compact = false }: NewsIntelligencePanelProps) {
  const { i18n, t } = useTranslation();
  const items = useNewsIntelligenceStore((state) => state.items);
  const filter = useNewsIntelligenceStore((state) => state.filter);
  const setFilter = useNewsIntelligenceStore((state) => state.setFilter);
  const loadNews = useNewsIntelligenceStore((state) => state.loadNews);
  const sourceAdapters = useNewsIntelligenceStore((state) => state.sourceAdapters);

  useEffect(() => {
    void loadNews(i18n.language);
  }, [i18n.language, loadNews]);

  const visibleItems = useMemo(() => {
    const normalizedSymbol = currentSymbol?.toUpperCase();
    return items
      .filter((item) => filter === "all" || item.category === filter)
      .filter((item) => !normalizedSymbol || item.relatedSymbols.length === 0 || item.relatedSymbols.includes(normalizedSymbol))
      .slice(0, compact ? 4 : 12);
  }, [compact, currentSymbol, filter, items]);

  const context = useMemo(() => buildNewsRiskContext(items, currentSymbol), [currentSymbol, items]);

  const counts = useMemo(
    () => ({
      risk: getCategoryCount(items, "risk"),
      onchain: getCategoryCount(items, "onchain"),
      macro: getCategoryCount(items, "macro"),
      htx: getCategoryCount(items, "htx"),
    }),
    [items],
  );

  function handleFilterChange(nextFilter: NewsFilter) {
    setFilter(nextFilter);
  }

  return (
    <section className={compact ? "news-intelligence-panel news-intelligence-panel--compact" : "news-intelligence-panel"} aria-labelledby={compact ? "news-brief-title" : "news-intelligence-title"}>
      <div className="news-intelligence-panel__heading">
        <div>
          <span>
            <Newspaper size={15} aria-hidden="true" />
            {t("newsIntelligence.kicker")}
          </span>
          <h2 id={compact ? "news-brief-title" : "news-intelligence-title"}>{t("newsIntelligence.title")}</h2>
          <p>{t("newsIntelligence.subtitle")}</p>
        </div>
        <div className="news-intelligence-panel__badges">
          <StatusPill variant="info">{t("newsIntelligence.labels.marketIntelligenceInput")}</StatusPill>
          <StatusPill variant="success">{t("newsIntelligence.labels.mockVisible")}</StatusPill>
        </div>
      </div>

      <NewsImpactSummary
        compact={compact}
        context={context}
        htxCount={counts.htx}
        macroCount={counts.macro}
        onChainCount={counts.onchain}
        riskEventCount={counts.risk}
        sourceAdapters={sourceAdapters}
      />

      {!compact ? <NewsFilterTabs activeFilter={filter} onFilterChange={handleFilterChange} /> : null}
      <NewsFeedList items={visibleItems} />
    </section>
  );
});
