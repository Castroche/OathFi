import {
  buildHardBlockReason,
  calculateFreshness,
  calculateRiskScores,
  classifyNewsDraft,
  classifySentiment,
  extractRiskTags,
  isHardBlockDraft,
} from "./newsClassifier";
import type { NormalizedNewsItem, RawNewsDraft } from "./newsTypes";

function clamp01(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").trim();
}

const blockedSourceUrlPattern = /\b(example\.com|fake|mock|placeholder)\b/i;

function getSourceDomain(sourceUrl: string | undefined, fallback: string | undefined) {
  if (!sourceUrl) {
    return fallback;
  }

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function isAllowedLiveSourceUrl(sourceUrl: string | undefined) {
  if (!sourceUrl || blockedSourceUrlPattern.test(sourceUrl)) {
    return false;
  }

  try {
    const parsed = new URL(sourceUrl);
    return parsed.protocol === "https:" && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function normalizeNewsDraft(draft: RawNewsDraft, now = Date.now()): NormalizedNewsItem {
  const category = classifyNewsDraft(draft);
  const sentiment = classifySentiment(draft);
  const tags = extractRiskTags(draft);
  const hardBlock = isHardBlockDraft(draft, category);
  const severity = clamp01(draft.severity, hardBlock ? 0.92 : sentiment === "negative" ? 0.68 : 0.42);
  const freshness = calculateFreshness(draft.publishedAt, category, hardBlock, now);
  const riskScores = calculateRiskScores({ category, sentiment, severity, freshness, tags });
  const isLive = draft.sourceStatus === "live";
  const sourceUrlAllowed = isLive && draft.urlVerified === true && isAllowedLiveSourceUrl(draft.sourceUrl);
  const sourceUrl = sourceUrlAllowed ? draft.sourceUrl : undefined;
  const sourceDomain = sourceUrlAllowed ? getSourceDomain(sourceUrl, draft.sourceDomain) : undefined;
  const titleOriginal = draft.titleOriginal ?? draft.titleEn ?? draft.title ?? draft.titleZh;
  const summaryOriginal = draft.summaryOriginal ?? draft.summaryEn ?? draft.summary ?? draft.summaryZh;

  return {
    id: draft.id,
    titleZh: draft.titleZh,
    summaryZh: draft.summaryZh,
    titleEn: draft.titleEn,
    summaryEn: draft.summaryEn,
    titleOriginal,
    summaryOriginal,
    title: draft.titleEn ?? titleOriginal,
    summary: draft.summaryEn ?? summaryOriginal,
    source: draft.source,
    sourceUrl,
    sourceDomain,
    urlVerified: sourceUrlAllowed,
    publishedAt: draft.publishedAt,
    fetchedAt: draft.fetchedAt ?? new Date(now).toISOString(),
    category,
    relatedSymbols: draft.relatedSymbols ?? [],
    relatedChains: draft.relatedChains ?? [],
    relatedProjects: draft.relatedProjects ?? [],
    severity,
    sentiment,
    reliability: clamp01(draft.reliability, draft.sourceStatus === "mock" ? 0.62 : 0.75),
    freshness,
    newsRisk: riskScores.newsRisk,
    newsSupport: riskScores.newsSupport,
    macroRisk: riskScores.macroRisk,
    onChainRisk: riskScores.onChainRisk,
    hardBlock,
    hardBlockReason: buildHardBlockReason(draft, category),
    tags,
    isLive,
    isMock: draft.isMock ?? draft.sourceStatus === "mock",
    sourceStatus: draft.sourceStatus,
  };
}

export function dedupeNewsItems(items: NormalizedNewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const titleKey = normalizeTitle(item.title).slice(0, 80);
    const sourceTimeKey = `${item.source}:${item.publishedAt}`;
    const urlKey = item.sourceUrl ? `url:${item.sourceUrl}` : "";
    const key = urlKey || sourceTimeKey || titleKey;
    const eventKey = `${item.category}:${titleKey}:${item.tags.slice(0, 3).join("|")}`;
    if (seen.has(key) || seen.has(eventKey)) {
      return false;
    }
    seen.add(key);
    seen.add(eventKey);
    return true;
  });
}

export function normalizeNewsDrafts(drafts: RawNewsDraft[], now = Date.now()) {
  return dedupeNewsItems(drafts.map((draft) => normalizeNewsDraft(draft, now))).sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );
}
