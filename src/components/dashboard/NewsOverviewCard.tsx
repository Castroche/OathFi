import { ArrowRight, Newspaper, RefreshCw, SendHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDashboardNewsOverview, type DashboardNewsOverviewItem, type DashboardNewsSentiment } from "../../api/news";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

function sentimentVariant(sentiment: DashboardNewsSentiment): StatusPillVariant {
  if (sentiment === "bullish") return "success";
  if (sentiment === "bearish") return "danger";
  return "info";
}

function priorityVariant(importance: number): StatusPillVariant {
  if (importance >= 70) return "danger";
  if (importance >= 50) return "warning";
  return "info";
}

function relativeTime(value: string, language: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "--";
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(language.toLowerCase().startsWith("zh") ? "zh-CN" : "en", { numeric: "auto" });
  if (abs < 60) return formatter.format(diffSeconds, "second");
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), "hour");
  return formatter.format(Math.round(diffSeconds / 86400), "day");
}

function NewsSkeleton() {
  return (
    <div className="news-overview-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function NewsHeadline({ item, language }: { item: DashboardNewsOverviewItem; language: string }) {
  const { t } = useTranslation();
  return (
    <article className="news-overview-headline">
      <div>
        <h3>{item.title}</h3>
        <p>
          {item.source}
          <span aria-hidden="true"> · </span>
          {relativeTime(item.publishedAt, language)}
          <span aria-hidden="true"> · </span>
          {t(`dashboard.newsOverview.categories.${item.category}`)}
        </p>
      </div>
      <div className="news-overview-headline__badges">
        <StatusPill variant={sentimentVariant(item.sentiment)}>{t(`dashboard.newsOverview.sentiment.${item.sentiment}`)}</StatusPill>
        <StatusPill variant={priorityVariant(item.importance)}>{item.importance}</StatusPill>
      </div>
    </article>
  );
}

export function NewsOverviewCard() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const newsQuery = useQuery({
    queryKey: ["dashboard", "news-overview", i18n.language, activeSymbol],
    queryFn: ({ signal }) => getDashboardNewsOverview(i18n.language, activeSymbol, signal),
    refetchInterval: 60_000,
  });
  const overview = newsQuery.data;

  return (
    <section className="news-overview" aria-labelledby="news-overview-title">
      <div className="section-heading">
        <div className="section-heading__title">
          <Newspaper size={15} aria-hidden="true" />
          <h2 id="news-overview-title">{t("dashboard.newsOverview.title")}</h2>
        </div>
        <div className="news-overview__actions">
          <button className="secondary-action secondary-action--icon" type="button" disabled={newsQuery.isFetching} onClick={() => void newsQuery.refetch()} aria-label={t("dashboard.newsOverview.refresh")}>
            <RefreshCw size={14} aria-hidden="true" />
          </button>
          <button className="secondary-action" type="button" onClick={() => navigate("/agent-lab")}>
            <span>{t("dashboard.newsOverview.viewMore")}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="news-overview__subtitle">{t("dashboard.newsOverview.subtitle")}</p>

      {newsQuery.isLoading ? <NewsSkeleton /> : null}
      {newsQuery.isError ? (
        <div className="news-overview-state" role="status">
          <strong>{t("dashboard.newsOverview.error")}</strong>
          <button className="secondary-action secondary-action--compact" type="button" onClick={() => void newsQuery.refetch()}>
            <RefreshCw size={13} aria-hidden="true" />
            <span>{t("dashboard.newsOverview.retry")}</span>
          </button>
        </div>
      ) : null}
      {!newsQuery.isLoading && !newsQuery.isError && (!overview || overview.items.length === 0) ? (
        <div className="news-overview-state" role="status">
          <strong>{t("dashboard.newsOverview.empty")}</strong>
        </div>
      ) : null}

      {overview && overview.items.length > 0 ? (
        <>
          <div className="news-overview-stats">
            <span>
              <em>{t("dashboard.newsOverview.latestNews")}</em>
              <strong>{overview.total}</strong>
            </span>
            <span>
              <em>{t("dashboard.newsOverview.highPriority")}</em>
              <strong>{overview.highPriority}</strong>
            </span>
            <span>
              <em>{t("dashboard.newsOverview.sentimentTilt")}</em>
              <strong>{t(`dashboard.newsOverview.sentiment.${overview.sentiment}`)}</strong>
            </span>
          </div>
          <div className="news-overview-list">
            {overview.items.map((item) => (
              <NewsHeadline key={item.id} item={item} language={i18n.language} />
            ))}
          </div>
          <div className="command-action-row">
            <button className="secondary-action secondary-action--muted" type="button" onClick={() => navigate("/agent-lab")}>
              <SendHorizontal size={14} aria-hidden="true" />
              <span>{t("dashboard.newsOverview.sendToAgent")}</span>
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
