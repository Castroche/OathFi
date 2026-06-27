import { useTranslation } from "react-i18next";
import type { NewsFilter } from "../../services/news/newsTypes";

const filters: NewsFilter[] = ["all", "crypto", "onchain", "macro", "funding", "htx", "risk"];

type NewsFilterTabsProps = {
  activeFilter: NewsFilter;
  onFilterChange: (filter: NewsFilter) => void;
};

export function NewsFilterTabs({ activeFilter, onFilterChange }: NewsFilterTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="news-filter-tabs" aria-label={t("newsIntelligence.filters.aria")}>
      {filters.map((filter) => (
        <button
          className={filter === activeFilter ? "is-active" : ""}
          key={filter}
          type="button"
          onClick={() => onFilterChange(filter)}
        >
          {t(`newsIntelligence.filters.${filter}`)}
        </button>
      ))}
    </div>
  );
}
