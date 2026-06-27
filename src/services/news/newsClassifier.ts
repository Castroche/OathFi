import type { NewsCategory, NewsSentiment, RawNewsDraft } from "./newsTypes";

const RISK_KEYWORDS = [
  "hack",
  "exploit",
  "vulnerability",
  "attack",
  "stolen",
  "suspend deposits",
  "deposit withdrawal suspension",
  "depeg",
  "regulatory investigation",
  "lawsuit",
  "liquidation",
  "unlock",
  "whale transfer",
  "exchange inflow",
  "treasury wallet",
  "bridge anomaly",
  "漏洞",
  "攻击",
  "被盗",
  "暂停充提",
  "脱锚",
  "监管调查",
  "清算",
  "解锁",
  "项目方钱包",
  "跨链桥异常",
];

const SUPPORT_KEYWORDS = [
  "funding",
  "partnership",
  "etf",
  "approval",
  "ecosystem fund",
  "mainnet",
  "upgrade",
  "listing",
  "institutional",
  "融资",
  "合作",
  "生态基金",
  "上线",
  "升级",
  "机构",
];

const HARD_BLOCK_KEYWORDS = [
  "hack",
  "exploit",
  "bridge exploit",
  "depeg",
  "suspend deposits",
  "deposit withdrawal suspension",
  "major regulatory enforcement",
  "treasury wallet",
  "large unlock",
  "security incident",
  "outage",
  "漏洞",
  "攻击",
  "被盗",
  "脱锚",
  "暂停充提",
  "监管执法",
  "项目方钱包",
  "大额解锁",
];

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  crypto: ["protocol", "mainnet", "upgrade", "listing", "delisting", "ecosystem", "project", "协议", "主网", "升级", "上币"],
  onchain: ["whale", "wallet", "inflow", "outflow", "unlock", "liquidation", "bridge", "链上", "鲸鱼", "钱包", "净流入", "解锁"],
  macro: ["fed", "cpi", "ppi", "nonfarm", "interest rate", "dxy", "treasury", "sanction", "美联储", "利率", "美元指数", "美债"],
  funding: ["funding", "vc", "investment", "fund", "merger", "etf flow", "融资", "投资", "基金", "并购"],
  htx: ["htx", "huobi", "trading pair", "deposit", "withdrawal", "公告", "交易对", "充提"],
  risk: RISK_KEYWORDS,
};

function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function countMatches(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.reduce((count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function getDraftText(draft: RawNewsDraft) {
  return [
    draft.titleZh,
    draft.summaryZh,
    draft.titleEn,
    draft.summaryEn,
    draft.titleOriginal,
    draft.summaryOriginal,
    draft.title,
    draft.summary,
    ...(draft.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function classifyNewsDraft(draft: RawNewsDraft): NewsCategory {
  if (draft.category) {
    return draft.category;
  }

  const text = getDraftText(draft);
  const ranked = (Object.keys(CATEGORY_KEYWORDS) as NewsCategory[])
    .map((category) => ({
      category,
      score: countMatches(text, CATEGORY_KEYWORDS[category]),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.score ? ranked[0].category : "crypto";
}

export function classifySentiment(draft: RawNewsDraft): NewsSentiment {
  if (draft.sentiment) {
    return draft.sentiment;
  }

  const text = getDraftText(draft);
  const riskMatches = countMatches(text, RISK_KEYWORDS);
  const supportMatches = countMatches(text, SUPPORT_KEYWORDS);

  if (riskMatches > 0 && supportMatches > 0) {
    return "mixed";
  }
  if (riskMatches > 0) {
    return "negative";
  }
  if (supportMatches > 0) {
    return "positive";
  }
  return "neutral";
}

export function extractRiskTags(draft: RawNewsDraft) {
  const text = getDraftText(draft);
  const riskTags = RISK_KEYWORDS.filter((keyword) => includesAny(text, [keyword]));
  const supportTags = SUPPORT_KEYWORDS.filter((keyword) => includesAny(text, [keyword]));
  return Array.from(new Set([...(draft.tags ?? []), ...riskTags, ...supportTags])).slice(0, 10);
}

export function getCategoryHalfLifeHours(category: NewsCategory, hardBlock: boolean) {
  if (hardBlock || category === "risk") {
    return 24;
  }
  if (category === "macro") {
    return 12;
  }
  if (category === "funding") {
    return 72;
  }
  if (category === "onchain") {
    return 8;
  }
  return 24;
}

export function calculateFreshness(publishedAt: string, category: NewsCategory, hardBlock: boolean, now = Date.now()) {
  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) {
    return 0;
  }
  const ageHours = Math.max(0, (now - publishedMs) / 3_600_000);
  return Math.max(0, Math.min(1, Math.exp(-ageHours / getCategoryHalfLifeHours(category, hardBlock))));
}

export function isHardBlockDraft(draft: RawNewsDraft, category: NewsCategory) {
  const text = getDraftText(draft);
  return category === "risk" && includesAny(text, HARD_BLOCK_KEYWORDS);
}

export function buildHardBlockReason(draft: RawNewsDraft, category: NewsCategory) {
  if (!isHardBlockDraft(draft, category)) {
    return undefined;
  }
  const text = getDraftText(draft);
  const matched = HARD_BLOCK_KEYWORDS.find((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
  return matched ? `Hard block keyword: ${matched}` : "Hard block risk event";
}

export function calculateRiskScores(params: {
  category: NewsCategory;
  sentiment: NewsSentiment;
  severity: number;
  freshness: number;
  tags: string[];
}) {
  const riskMatchBoost = countMatches(params.tags.join(" "), RISK_KEYWORDS) > 0 ? 0.2 : 0;
  const supportMatchBoost = countMatches(params.tags.join(" "), SUPPORT_KEYWORDS) > 0 ? 0.18 : 0;
  const negativeFactor = params.sentiment === "negative" ? 1 : params.sentiment === "mixed" ? 0.65 : 0.25;
  const positiveFactor = params.sentiment === "positive" ? 1 : params.sentiment === "mixed" ? 0.45 : 0.1;
  const baseRisk = Math.min(1, params.severity * negativeFactor * params.freshness + riskMatchBoost);
  const support = Math.min(1, params.severity * positiveFactor * params.freshness + supportMatchBoost);

  return {
    newsRisk: params.category === "funding" && params.sentiment === "positive" ? Math.min(0.25, baseRisk) : baseRisk,
    newsSupport: params.sentiment === "negative" ? 0 : support,
    macroRisk: params.category === "macro" ? baseRisk : 0,
    onChainRisk: params.category === "onchain" || params.category === "risk" ? baseRisk : 0,
  };
}
