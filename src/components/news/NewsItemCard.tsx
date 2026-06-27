import { AlertTriangle, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import { getLocalizedNewsText } from "../../services/news/newsLocalization";
import type { NormalizedNewsItem } from "../../services/news/newsTypes";
import { NewsRiskBadge } from "./NewsRiskBadge";
import { NewsSourceStatus } from "./NewsSourceStatus";

function formatTime(value: string, locale: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function NewsItemCard({ item }: { item: NormalizedNewsItem }) {
  const { i18n, t } = useTranslation();
  const localized = getLocalizedNewsText(item, i18n.language);
  const sourceModeKey = item.isMock ? "newsIntelligence.labels.mockItem" : item.isLive ? "newsIntelligence.labels.liveItem" : "newsIntelligence.labels.nonLiveItem";
  const sourceDomain = item.sourceDomain ?? t("newsIntelligence.labels.syntheticSource");

  return (
    <article className={`news-item-card news-item-card--${item.category}`}>
      <div className="news-item-card__main">
        <header>
          <div>
            <span className="news-item-card__source">
              {item.source} / {formatTime(item.publishedAt, i18n.language)}
            </span>
            <h3>{localized.title}</h3>
          </div>
          <div className="news-item-card__badges">
            <NewsSourceStatus status={item.sourceStatus} />
            <NewsRiskBadge value={Math.max(item.newsRisk, item.onChainRisk, item.macroRisk)} />
          </div>
        </header>
        <p>{localized.summary}</p>
        <div className="news-item-card__meta">
          {item.isMock ? <StatusPill variant="warning">{t("newsIntelligence.labels.mockItem")}</StatusPill> : null}
          <StatusPill variant="info">{t("newsIntelligence.labels.sourceType")}: {item.source}</StatusPill>
          <StatusPill variant="neutral">{t(`newsIntelligence.categories.${item.category}`)}</StatusPill>
          <StatusPill variant={item.sentiment === "negative" ? "danger" : item.sentiment === "positive" ? "success" : "info"}>
            {t(`newsIntelligence.sentiment.${item.sentiment}`)}
          </StatusPill>
          <span>
            {t("newsIntelligence.labels.severity")}: {(item.severity * 100).toFixed(0)}
          </span>
          <span>
            {t("newsIntelligence.labels.freshness")}: {(item.freshness * 100).toFixed(0)}
          </span>
          <span>{t(sourceModeKey)}</span>
        </div>
        <dl className="news-source-proof">
          <div>
            <dt>{t("newsIntelligence.labels.sourceType")}</dt>
            <dd>{t(`newsIntelligence.sourceStatus.${item.sourceStatus}`)}</dd>
          </div>
          <div>
            <dt>{t("newsIntelligence.labels.sourceDomain")}</dt>
            <dd>{sourceDomain}</dd>
          </div>
          <div>
            <dt>{t("newsIntelligence.labels.urlVerification")}</dt>
            <dd>{item.urlVerified ? t("newsIntelligence.labels.urlVerified") : t("newsIntelligence.labels.urlNotVerified")}</dd>
          </div>
        </dl>
      </div>

      <div className="news-item-card__side">
        <div className="news-symbol-list" aria-label={t("newsIntelligence.labels.relatedSymbols")}>
          {item.relatedSymbols.length > 0 ? item.relatedSymbols.map((symbol) => <code key={symbol}>{symbol}</code>) : <code>{t("newsIntelligence.labels.marketWide")}</code>}
        </div>
        {item.hardBlock ? (
          <div className="news-hard-block">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{t("newsIntelligence.labels.hardBlock")}</span>
            <small>{item.hardBlockReason}</small>
          </div>
        ) : null}
        <div className="news-tag-list">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {item.sourceUrl && item.urlVerified ? (
          <a className="news-source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
            <span>{t("newsIntelligence.actions.openSource")}</span>
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
