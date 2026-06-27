export type NewsSourceStatus =
  | "live"
  | "mock"
  | "planned"
  | "backend-required"
  | "unavailable"
  | "error";

export type NewsCategory = "crypto" | "onchain" | "macro" | "funding" | "htx" | "risk";

export type NewsFilter = "all" | NewsCategory;

export type NewsSentiment = "positive" | "neutral" | "negative" | "mixed";

export type NormalizedNewsItem = {
  id: string;
  titleZh: string;
  summaryZh: string;
  titleEn: string;
  summaryEn: string;
  titleOriginal: string;
  summaryOriginal: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  sourceDomain?: string;
  urlVerified: boolean;
  publishedAt: string;
  fetchedAt: string;
  category: NewsCategory;
  relatedSymbols: string[];
  relatedChains: string[];
  relatedProjects: string[];
  severity: number;
  sentiment: NewsSentiment;
  reliability: number;
  freshness: number;
  newsRisk: number;
  newsSupport: number;
  macroRisk: number;
  onChainRisk: number;
  hardBlock: boolean;
  hardBlockReason?: string;
  tags: string[];
  isLive: boolean;
  isMock: boolean;
  sourceStatus: NewsSourceStatus;
};

export type NewsRiskContext = {
  newsRisk: number;
  newsSupport: number;
  macroRisk: number;
  onChainRisk: number;
  hardBlockEvent: boolean;
  hardBlockReasons: string[];
  warnings: NormalizedNewsItem[];
  relatedSymbols: string[];
};

export type NewsSourceAdapterMeta = {
  id: string;
  name: string;
  sourceStatus: NewsSourceStatus;
  categoryHint?: NewsCategory;
  requiresBackend: boolean;
  cadence: "mock" | "planned" | "hourly" | "realtime" | "manual";
};

export type RawNewsDraft = {
  id: string;
  titleZh: string;
  summaryZh: string;
  titleEn: string;
  summaryEn: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  title?: string;
  summary?: string;
  source: string;
  sourceUrl?: string;
  sourceDomain?: string;
  urlVerified?: boolean;
  publishedAt: string;
  fetchedAt?: string;
  category?: NewsCategory;
  relatedSymbols?: string[];
  relatedChains?: string[];
  relatedProjects?: string[];
  sentiment?: NewsSentiment;
  reliability?: number;
  severity?: number;
  tags?: string[];
  sourceStatus: NewsSourceStatus;
  isMock?: boolean;
};
