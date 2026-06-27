import type { MarketKline, MarketOrderBook, MarketTicker, MarketTrade } from "../htx/htxTypes";
import type { NewsRiskContext, NormalizedNewsItem } from "../news/newsTypes";

export type DecisionAction =
  | "OBSERVE"
  | "WAIT"
  | "ALLOW_PAPER_LONG"
  | "ALLOW_PAPER_SHORT"
  | "REDUCE_SIZE"
  | "BLOCK"
  | "NO_TRADE";

export type DecisionDirection = "long" | "short";

export type MarketRegime =
  | "breakout-attempt"
  | "pullback-watch"
  | "range-bound"
  | "volatility-expansion"
  | "liquidity-thin"
  | "risk-off";

export type DirectionalFeatureScores = {
  trend: number;
  momentum: number;
  volume: number;
  liquidity: number;
  volatilityQuality: number;
  riskReward: number;
};

export type ExtractedMarketFeatures = {
  symbol: string;
  long: DirectionalFeatureScores;
  short: DirectionalFeatureScores;
  spreadPct: number;
  atrPercent: number;
  liquidityScore: number;
  dataQuality: number;
  signalConflict: number;
  riskRewardRatio: number;
  marketRegime: MarketRegime;
  currentSetup: string;
  nextConfirmation: string;
  evidence: string[];
  warnings: string[];
};

export type DecisionInput = {
  symbol: string;
  ticker: MarketTicker | null;
  klines: MarketKline[];
  orderBook: MarketOrderBook | null;
  trades: MarketTrade[];
  newsRiskContext: NewsRiskContext;
  referencedNews?: NormalizedNewsItem[];
  dataSource: string;
  connectionStatus: string;
  lastUpdated: number | null;
  latencyMs: number | null;
};

export type ScoreBreakdown = {
  trend: number;
  momentum: number;
  volume: number;
  liquidity: number;
  volatilityQuality: number;
  riskReward: number;
  marketConfidence: number;
  eventRiskMultiplier: number;
  dataReliabilityMultiplier: number;
  conflictMultiplier: number;
};

export type HardBlockResult = {
  hardBlock: boolean;
  reasons: string[];
};

export type LiveDecision = {
  symbol: string;
  generatedAt: string;
  marketRegime: MarketRegime;
  currentSetup: string;
  confidence: number;
  feasibility: number;
  risk: number;
  action: DecisionAction;
  nextConfirmation: string;
  longConfidence: number;
  shortConfidence: number;
  marketConfidence: number;
  finalConfidence: number;
  feasibilityScore: number;
  riskScore: number;
  newsRisk: number;
  newsSupport: number;
  onChainRisk: number;
  onChainSupport: number;
  macroRisk: number;
  dataReliabilityMultiplier: number;
  conflictMultiplier: number;
  eventRiskMultiplier: number;
  scoreBreakdown: ScoreBreakdown;
  hardBlock: boolean;
  hardBlockReasons: string[];
  evidence: string[];
  warnings: string[];
  referencedNews: NormalizedNewsItem[];
  referencedOnChainAlerts: NormalizedNewsItem[];
};

export type DecisionThresholds = {
  maxSpreadPct: number;
  maxAtrPercent: number;
  minLiquidityScore: number;
  minDataQuality: number;
  minRiskReward: number;
};

export const defaultDecisionThresholds: DecisionThresholds = {
  maxSpreadPct: 0.35,
  maxAtrPercent: 8,
  minLiquidityScore: 35,
  minDataQuality: 0.45,
  minRiskReward: 1.2,
};
