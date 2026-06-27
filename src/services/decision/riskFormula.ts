import type { ExtractedMarketFeatures } from "./decisionTypes";
import { clampScore, roundScore } from "./scoreNormalize";

export function calculateRiskScore({
  features,
  newsRisk,
  onChainRisk,
  macroRisk,
  hardBlock,
}: {
  features: ExtractedMarketFeatures;
  newsRisk: number;
  onChainRisk: number;
  macroRisk: number;
  hardBlock: boolean;
}) {
  if (hardBlock) {
    return 100;
  }

  const spreadRisk = Math.min(100, features.spreadPct * 180);
  const atrRisk = Math.min(100, features.atrPercent * 13);
  const liquidityRisk = 100 - features.liquidityScore;
  const dataRisk = (1 - features.dataQuality) * 100;
  const conflictRisk = features.signalConflict * 100;
  const eventRisk = Math.max(newsRisk * 100, onChainRisk * 100, macroRisk * 100);

  return roundScore(
    clampScore(
      spreadRisk * 0.16 +
        atrRisk * 0.18 +
        liquidityRisk * 0.17 +
        dataRisk * 0.14 +
        conflictRisk * 0.15 +
        eventRisk * 0.2,
    ),
  );
}
