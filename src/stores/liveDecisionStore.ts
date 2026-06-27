import { create } from "zustand";
import type { DecisionInput, LiveDecision } from "../services/decision/decisionTypes";
import { createNeutralDecision, evaluateLiveDecision } from "../services/decision/decisionEngine";

type LiveDecisionState = {
  decision: LiveDecision;
  refreshDecision: (input: DecisionInput) => void;
  resetDecision: (symbol?: string) => void;
};

export const useLiveDecisionStore = create<LiveDecisionState>()((set) => ({
  decision: createNeutralDecision(),
  refreshDecision: (input) =>
    set({
      decision: evaluateLiveDecision(input),
    }),
  resetDecision: (symbol) =>
    set({
      decision: createNeutralDecision(symbol),
    }),
}));

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as Window & {
    __OATHFI_DECISION__?: {
      getState: typeof useLiveDecisionStore.getState;
    };
  }).__OATHFI_DECISION__ = {
    getState: useLiveDecisionStore.getState,
  };
}
