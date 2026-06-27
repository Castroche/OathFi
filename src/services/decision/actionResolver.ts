import type { DecisionAction, DecisionDirection } from "./decisionTypes";

export function resolveDecisionAction({
  hardBlock,
  riskScore,
  feasibilityScore,
  finalConfidence,
  longConfidence,
  shortConfidence,
}: {
  hardBlock: boolean;
  riskScore: number;
  feasibilityScore: number;
  finalConfidence: number;
  longConfidence: number;
  shortConfidence: number;
}): { action: DecisionAction; direction: DecisionDirection | null } {
  const direction: DecisionDirection = longConfidence >= shortConfidence ? "long" : "short";
  const unclearDirectionalEdge = Math.abs(longConfidence - shortConfidence) < 8;

  if (hardBlock) {
    return { action: "BLOCK", direction: null };
  }
  if (riskScore >= 80) {
    return { action: "BLOCK", direction: null };
  }
  if (feasibilityScore < 40) {
    return { action: riskScore >= 70 ? "BLOCK" : "WAIT", direction: null };
  }
  if (unclearDirectionalEdge) {
    return { action: finalConfidence >= 60 ? "WAIT" : "NO_TRADE", direction: null };
  }
  if (finalConfidence >= 75 && feasibilityScore >= 65 && riskScore <= 45) {
    return {
      action: direction === "long" ? "ALLOW_PAPER_LONG" : "ALLOW_PAPER_SHORT",
      direction,
    };
  }
  if (finalConfidence >= 60 && feasibilityScore >= 50 && riskScore <= 65) {
    return { action: "WAIT", direction };
  }
  if (riskScore > 65 && finalConfidence >= 60) {
    return { action: "REDUCE_SIZE", direction };
  }
  return { action: "NO_TRADE", direction: null };
}
