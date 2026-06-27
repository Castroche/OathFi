import { buildNewsRiskContext } from "../news/newsSelectors";
import type { DecisionInput, LiveDecision, ScoreBreakdown } from "./decisionTypes";
import { resolveDecisionAction } from "./actionResolver";
import {
  calculateDataReliabilityMultiplier,
  calculateEventRiskMultiplier,
  calculateFinalConfidence,
  calculateMarketConfidence,
  calculateConflictMultiplier,
} from "./confidenceFormula";
import { calculateFeasibilityScore } from "./feasibilityFormula";
import { evaluateHardBlocks } from "./hardBlockRules";
import { extractMarketFeatures } from "./marketFeatureExtractor";
import { calculateRiskScore } from "./riskFormula";

function buildScoreBreakdown(
  directionScores: ScoreBreakdown,
): ScoreBreakdown {
  return directionScores;
}

export function createNeutralDecision(symbol = "ETH/USDT"): LiveDecision {
  return {
    symbol,
    generatedAt: new Date().toISOString(),
    marketRegime: "range-bound",
    currentSetup: "Range-bound observation",
    confidence: 0,
    feasibility: 0,
    risk: 0,
    action: "OBSERVE",
    nextConfirmation: "Waiting for market data and confirmation",
    longConfidence: 0,
    shortConfidence: 0,
    marketConfidence: 0,
    finalConfidence: 0,
    feasibilityScore: 0,
    riskScore: 0,
    newsRisk: 0,
    newsSupport: 0,
    onChainRisk: 0,
    onChainSupport: 0,
    macroRisk: 0,
    dataReliabilityMultiplier: 1,
    conflictMultiplier: 1,
    eventRiskMultiplier: 1,
    scoreBreakdown: {
      trend: 0,
      momentum: 0,
      volume: 0,
      liquidity: 0,
      volatilityQuality: 0,
      riskReward: 0,
      marketConfidence: 0,
      eventRiskMultiplier: 1,
      dataReliabilityMultiplier: 1,
      conflictMultiplier: 1,
    },
    hardBlock: false,
    hardBlockReasons: [],
    evidence: [],
    warnings: [],
    referencedNews: [],
    referencedOnChainAlerts: [],
  };
}

export function evaluateLiveDecision(input: DecisionInput): LiveDecision {
  const newsRiskContext = input.newsRiskContext ?? buildNewsRiskContext([], input.symbol);
  const features = extractMarketFeatures(input);
  const onChainSupport = Math.max(
    0,
    ...newsRiskContext.warnings
      .filter((item) => item.category === "onchain" && item.sentiment === "positive")
      .map((item) => item.newsSupport),
  );
  const newsHardBlock = newsRiskContext.hardBlockEvent;
  const onChainHardBlock = newsRiskContext.warnings.some((item) => item.category === "onchain" && item.hardBlock);
  const hardBlockResult = evaluateHardBlocks(features, {
    newsHardBlock,
    onChainHardBlock,
    hardBlockReasons: newsRiskContext.hardBlockReasons,
  });

  const longMarketConfidence = calculateMarketConfidence(features.long);
  const shortMarketConfidence = calculateMarketConfidence(features.short);
  const preferredScores = longMarketConfidence >= shortMarketConfidence ? features.long : features.short;
  const marketConfidence = Math.max(longMarketConfidence, shortMarketConfidence);
  const eventRiskMultiplier = calculateEventRiskMultiplier({
    newsRisk: newsRiskContext.newsRisk,
    newsSupport: newsRiskContext.newsSupport,
    onChainRisk: newsRiskContext.onChainRisk,
    onChainSupport,
    macroRisk: newsRiskContext.macroRisk,
  });
  const dataReliabilityMultiplier = calculateDataReliabilityMultiplier(features.dataQuality);
  const conflictMultiplier = calculateConflictMultiplier(features.signalConflict);
  const finalConfidence = calculateFinalConfidence({
    marketConfidence,
    eventRiskMultiplier,
    dataReliabilityMultiplier,
    conflictMultiplier,
  });
  const riskScore = calculateRiskScore({
    features,
    newsRisk: newsRiskContext.newsRisk,
    onChainRisk: newsRiskContext.onChainRisk,
    macroRisk: newsRiskContext.macroRisk,
    hardBlock: hardBlockResult.hardBlock,
  });
  const feasibilityScore = calculateFeasibilityScore({
    features,
    finalConfidence,
    riskScore,
  });
  const { action } = resolveDecisionAction({
    hardBlock: hardBlockResult.hardBlock,
    riskScore,
    feasibilityScore,
    finalConfidence,
    longConfidence: longMarketConfidence,
    shortConfidence: shortMarketConfidence,
  });
  const scoreBreakdown = buildScoreBreakdown({
    trend: Math.round(preferredScores.trend * 100),
    momentum: Math.round(preferredScores.momentum * 100),
    volume: Math.round(preferredScores.volume * 100),
    liquidity: Math.round(preferredScores.liquidity * 100),
    volatilityQuality: Math.round(preferredScores.volatilityQuality * 100),
    riskReward: Math.round(preferredScores.riskReward * 100),
    marketConfidence,
    eventRiskMultiplier,
    dataReliabilityMultiplier,
    conflictMultiplier,
  });
  const referencedNews = newsRiskContext.warnings.slice(0, 4);
  const referencedOnChainAlerts = referencedNews.filter((item) => item.category === "onchain");

  return {
    symbol: input.symbol,
    generatedAt: new Date().toISOString(),
    marketRegime: features.marketRegime,
    currentSetup: features.currentSetup,
    confidence: finalConfidence,
    feasibility: feasibilityScore,
    risk: riskScore,
    action,
    nextConfirmation: features.nextConfirmation,
    longConfidence: longMarketConfidence,
    shortConfidence: shortMarketConfidence,
    marketConfidence,
    finalConfidence,
    feasibilityScore,
    riskScore,
    newsRisk: newsRiskContext.newsRisk,
    newsSupport: newsRiskContext.newsSupport,
    onChainRisk: newsRiskContext.onChainRisk,
    onChainSupport,
    macroRisk: newsRiskContext.macroRisk,
    dataReliabilityMultiplier,
    conflictMultiplier,
    eventRiskMultiplier,
    scoreBreakdown,
    hardBlock: hardBlockResult.hardBlock,
    hardBlockReasons: hardBlockResult.reasons,
    evidence: [...features.evidence, ...newsRiskContext.relatedSymbols.slice(0, 2).map((symbol) => `Related intelligence symbol: ${symbol}`)],
    warnings: [...features.warnings, ...newsRiskContext.warnings.slice(0, 3).map((item) => item.title)],
    referencedNews,
    referencedOnChainAlerts,
  };
}
