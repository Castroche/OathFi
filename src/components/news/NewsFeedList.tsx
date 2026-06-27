import { useTranslation } from "react-i18next";
import type { NormalizedNewsItem } from "../../services/news/newsTypes";
import { NewsItemCard } from "./NewsItemCard";

export function NewsFeedList({ items }: { items: NormalizedNewsItem[] }) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return <div className="news-empty-state">{t("newsIntelligence.empty")}</div>;
  }

  return (
    <div className="news-feed-list" aria-label={t("newsIntelligence.feedAria")}>
      {items.map((item) => (
        <NewsItemCard item={item} key={item.id} />
      ))}
    </div>
  );
}
