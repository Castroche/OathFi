import type { DirectionalFeatureScores, ScoreBreakdown } from "./decisionTypes";
import { clamp, clampScore, roundScore, weightedGeometricMean } from "./scoreNormalize";

export function calculateMarketConfidence(scores: DirectionalFeatureScores) {
  return roundScore(
    100 *
      weightedGeometricMean([
        { value: scores.trend, weight: 0.25 },
        { value: scores.momentum, weight: 0.2 },
        { value: scores.volume, weight: 0.15 },
        { value: scores.liquidity, weight: 0.15 },
        { value: scores.volatilityQuality, weight: 0.1 },
        { value: scores.riskReward, weight: 0.15 },
      ]),
  );
}

export function calculateEventRiskMultiplier({
  newsRisk,
  newsSupport,
  onChainRisk,
  onChainSupport,
  macroRisk,
}: {
  newsRisk: number;
  newsSupport: number;
  onChainRisk: number;
  onChainSupport: number;
  macroRisk: number;
}) {
  const riskDrag = Math.exp(-0.18 * newsRisk - 0.12 * onChainRisk - 0.08 * macroRisk);
  const supportLift = 1 + 0.04 * newsSupport + 0.03 * onChainSupport;
  return clamp(riskDrag * supportLift, 0.55, 1.07);
}

export function calculateDataReliabilityMultiplier(dataQuality: number) {
  return clamp(0.6 + 0.4 * dataQuality, 0.6, 1);
}

export function calculateConflictMultiplier(signalConflict: number) {
  return clamp(1 - 0.35 * signalConflict, 0.65, 1);
}

export function calculateFinalConfidence({
  marketConfidence,
  eventRiskMultiplier,
  dataReliabilityMultiplier,
  conflictMultiplier,
}: Pick<ScoreBreakdown, "marketConfidence" | "eventRiskMultiplier" | "dataReliabilityMultiplier" | "conflictMultiplier">) {
  return roundScore(
    clampScore(marketConfidence * eventRiskMultiplier * dataReliabilityMultiplier * conflictMultiplier),
  );
}
