import { apiRequest } from "./client";
import { normalizeNewsDrafts } from "../services/news/newsNormalizer";
import type { NewsCategory, NewsSentiment, NewsSourceStatus, RawNewsDraft } from "../services/news/newsTypes";

export type DashboardNewsCategory = "onchain" | "macro" | "regulation" | "funding" | "exchange" | "market";
export type DashboardNewsSentiment = "bullish" | "bearish" | "neutral";

export type DashboardNewsOverviewItem = {
  id: string;
  title: string;
  titleZh: string;
  titleEn: string;
  source: string;
  publishedAt: string;
  category: DashboardNewsCategory;
  originalCategory: NewsCategory;
  sentiment: DashboardNewsSentiment;
  importance: number;
  url?: string;
  sourceDomain?: string;
};

export type DashboardNewsOverview = {
  total: number;
  highPriority: number;
  sentiment: DashboardNewsSentiment;
  items: DashboardNewsOverviewItem[];
};

type BackendNewsEvent = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string | null;
  language: string;
  published_at: string;
  is_mock: boolean;
  category?: NewsCategory;
  sentiment?: NewsSentiment;
  severity?: number;
  reliability?: number;
  tags?: string[];
  related_symbols?: string[];
  source_status?: NewsSourceStatus;
  source_domain?: string | null;
  url_verified?: boolean;
};

function toRawNewsDraft(event: BackendNewsEvent, language: string): RawNewsDraft {
  const wantsChinese = language.toLowerCase().startsWith("zh");
  const sourceStatus = event.source_status ?? (event.is_mock ? "unavailable" : "live");
  return {
    id: event.id,
    titleZh: wantsChinese ? event.title : event.title,
    summaryZh: wantsChinese ? event.summary : event.summary,
    titleEn: wantsChinese ? event.title : event.title,
    summaryEn: wantsChinese ? event.summary : event.summary,
    titleOriginal: event.title,
    summaryOriginal: event.summary,
    source: event.source,
    sourceUrl: event.url ?? undefined,
    sourceDomain: event.source_domain ?? safeHostname(event.url),
    urlVerified: event.url_verified ?? Boolean(event.url),
    publishedAt: event.published_at,
    fetchedAt: new Date().toISOString(),
    category: event.category ?? "crypto",
    relatedSymbols: event.related_symbols ?? [],
    sentiment: event.sentiment ?? "neutral",
    reliability: event.reliability ?? (event.is_mock ? 0.3 : 0.75),
    severity: event.severity ?? (event.is_mock ? 0 : 0.42),
    tags: event.tags ?? (event.source ? [event.source] : []),
    sourceStatus,
    isMock: false,
  };
}

function safeHostname(url: string | null) {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export async function fetchNewsLatest(language: string, limit = 12, signal?: AbortSignal) {
  const events = await apiRequest<BackendNewsEvent[]>(
    `/api/news/latest?language=${encodeURIComponent(language)}&limit=${limit}`,
    { signal },
  );
  return events.map((event) => toRawNewsDraft(event, language));
}

function dashboardCategory(category: NewsCategory): DashboardNewsCategory {
  if (category === "onchain") return "onchain";
  if (category === "macro") return "macro";
  if (category === "funding") return "funding";
  if (category === "htx") return "exchange";
  if (category === "risk") return "regulation";
  return "market";
}

function dashboardSentiment(sentiment: NewsSentiment): DashboardNewsSentiment {
  if (sentiment === "positive") return "bullish";
  if (sentiment === "negative") return "bearish";
  return "neutral";
}

function overviewSentiment(items: DashboardNewsOverviewItem[]): DashboardNewsSentiment {
  const bullish = items.filter((item) => item.sentiment === "bullish").length;
  const bearish = items.filter((item) => item.sentiment === "bearish").length;
  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}

export async function getDashboardNewsOverview(language: string, symbol?: string, signal?: AbortSignal): Promise<DashboardNewsOverview> {
  const drafts = await fetchNewsLatest(language, 18, signal);
  const normalizedSymbol = symbol?.toUpperCase();
  const normalizedItems = normalizeNewsDrafts(drafts).filter(
    (item) => !normalizedSymbol || item.relatedSymbols.length === 0 || item.relatedSymbols.includes(normalizedSymbol),
  );
  const items = normalizedItems.slice(0, 5).map((item) => ({
    id: item.id,
    title: language.toLowerCase().startsWith("zh") ? item.titleZh || item.titleOriginal || item.titleEn : item.titleEn || item.titleOriginal || item.titleZh,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    source: item.source,
    publishedAt: item.publishedAt,
    category: dashboardCategory(item.category),
    originalCategory: item.category,
    sentiment: dashboardSentiment(item.sentiment),
    importance: Math.round(Math.max(item.severity, item.newsRisk, item.macroRisk, item.onChainRisk) * 100),
    url: item.sourceUrl,
    sourceDomain: item.sourceDomain,
  }));

  return {
    total: normalizedItems.length,
    highPriority: normalizedItems.filter((item) => item.hardBlock || item.severity >= 0.6 || item.newsRisk >= 0.55 || item.macroRisk >= 0.45 || item.onChainRisk >= 0.55).length,
    sentiment: overviewSentiment(items),
    items,
  };
}
