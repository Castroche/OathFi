import type { ExtractedMarketFeatures } from "./decisionTypes";
import { clampScore, normalizeUnit, roundScore, weightedGeometricMean } from "./scoreNormalize";

export function calculateFeasibilityScore({
  features,
  finalConfidence,
  riskScore,
}: {
  features: ExtractedMarketFeatures;
  finalConfidence: number;
  riskScore: number;
}) {
  const spreadQuality = normalizeUnit(0.4 - features.spreadPct, 0, 0.4);
  const liquidityQuality = normalizeUnit(features.liquidityScore);
  const dataQuality = Math.max(0.05, features.dataQuality);
  const rrQuality = normalizeUnit(features.riskRewardRatio, 1, 3);
  const confidenceQuality = normalizeUnit(finalConfidence);
  const riskQuality = normalizeUnit(100 - riskScore);

  return roundScore(
    clampScore(
      100 *
        weightedGeometricMean([
          { value: spreadQuality, weight: 0.14 },
          { value: liquidityQuality, weight: 0.2 },
          { value: dataQuality, weight: 0.18 },
          { value: rrQuality, weight: 0.18 },
          { value: confidenceQuality, weight: 0.16 },
          { value: riskQuality, weight: 0.14 },
        ]),
    ),
  );
}
