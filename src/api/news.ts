import { apiRequest } from "./client";
import type { NewsCategory, NewsSentiment, NewsSourceStatus, RawNewsDraft } from "../services/news/newsTypes";

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
