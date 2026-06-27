import { AlertTriangle, BellRing, Landmark, RadioTower, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import type { NewsRiskContext, NewsSourceAdapterMeta } from "../../services/news/newsTypes";
import { NewsSourceStatus } from "./NewsSourceStatus";

type NewsImpactSummaryProps = {
  context: NewsRiskContext;
  riskEventCount: number;
  onChainCount: number;
  macroCount: number;
  htxCount: number;
  sourceAdapters?: NewsSourceAdapterMeta[];
  compact?: boolean;
};

function percent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export function NewsImpactSummary({
  context,
  riskEventCount,
  onChainCount,
  macroCount,
  htxCount,
  sourceAdapters = [],
  compact = false,
}: NewsImpactSummaryProps) {
  const { t } = useTranslation();
  const summaryItems = [
    {
      id: "risk",
      icon: ShieldAlert,
      labelKey: "newsIntelligence.summary.riskEvents",
      value: String(riskEventCount),
      meta: percent(context.newsRisk),
      variant: context.hardBlockEvent ? "danger" : "warning",
    },
    {
      id: "onchain",
      icon: RadioTower,
      labelKey: "newsIntelligence.summary.onChainWarnings",
      value: String(onChainCount),
      meta: percent(context.onChainRisk),
      variant: context.onChainRisk >= 0.55 ? "warning" : "info",
    },
    {
      id: "macro",
      icon: Landmark,
      labelKey: "newsIntelligence.summary.macroEvents",
      value: String(macroCount),
      meta: percent(context.macroRisk),
      variant: context.macroRisk >= 0.45 ? "warning" : "neutral",
    },
    {
      id: "htx",
      icon: BellRing,
      labelKey: "newsIntelligence.summary.htxEcosystem",
      value: String(htxCount),
      meta: percent(context.newsSupport),
      variant: "info",
    },
  ] as const;

  return (
    <div className={compact ? "news-impact-summary news-impact-summary--compact" : "news-impact-summary"}>
      <div className="news-impact-summary__grid">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <article className={`news-impact-tile news-impact-tile--${item.variant}`} key={item.id}>
              <span>
                <Icon size={15} aria-hidden="true" />
                {t(item.labelKey)}
              </span>
              <strong>{item.value}</strong>
              <p>{item.meta}</p>
            </article>
          );
        })}
      </div>
      {context.hardBlockEvent ? (
        <div className="news-impact-summary__hard-block">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{t("newsIntelligence.summary.hardBlockActive")}</span>
          <small>{context.hardBlockReasons[0]}</small>
        </div>
      ) : null}
      {!compact ? (
        <div className="news-source-plan" aria-label={t("newsIntelligence.sources.aria")}>
          <span>{t("newsIntelligence.sources.title")}</span>
          {sourceAdapters.slice(0, 6).map((source) => (
            <div className="news-source-plan__item" key={source.id}>
              <strong>{source.name}</strong>
              <NewsSourceStatus status={source.sourceStatus} />
            </div>
          ))}
          <StatusPill variant="info">{t("newsIntelligence.sources.noSecrets")}</StatusPill>
        </div>
      ) : null}
    </div>
  );
}
