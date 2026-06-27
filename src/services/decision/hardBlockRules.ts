import type { DecisionThresholds, ExtractedMarketFeatures, HardBlockResult } from "./decisionTypes";
import { defaultDecisionThresholds } from "./decisionTypes";

export function evaluateHardBlocks(
  features: ExtractedMarketFeatures,
  input: {
    newsHardBlock: boolean;
    onChainHardBlock: boolean;
    hardBlockReasons: string[];
  },
  thresholds: DecisionThresholds = defaultDecisionThresholds,
): HardBlockResult {
  const reasons = new Set<string>();

  if (features.riskRewardRatio < thresholds.minRiskReward) {
    reasons.add("R/R below 1.2");
  }
  if (features.spreadPct > thresholds.maxSpreadPct) {
    reasons.add("Spread exceeds max threshold");
  }
  if (features.atrPercent > thresholds.maxAtrPercent) {
    reasons.add("ATR percent exceeds max threshold");
  }
  if (input.newsHardBlock) {
    reasons.add("News hard-block event");
  }
  if (input.onChainHardBlock) {
    reasons.add("On-chain hard-block event");
  }
  if (features.liquidityScore < thresholds.minLiquidityScore) {
    reasons.add("Liquidity below minimum threshold");
  }
  if (features.dataQuality < thresholds.minDataQuality) {
    reasons.add("Data quality below minimum threshold");
  }

  input.hardBlockReasons.forEach((reason) => reasons.add(reason));

  return {
    hardBlock: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}
