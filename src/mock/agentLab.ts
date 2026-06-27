import type { CommandCenterVariant } from "./commandCenter";

export const agentLabBrief = {
  symbol: "ETH/USDT",
  venue: "HTX",
  timeframe: "15m / 1h",
  confidence: "82/100",
  questionKey: "agentLab.brief.question",
  scopeKey: "agentLab.brief.scope",
  modeKey: "agentLab.brief.mode",
};

export const agentLabMetrics = [
  {
    id: "context",
    titleKey: "agentLab.metrics.context.title",
    value: "7",
    metaKey: "agentLab.metrics.context.meta",
    variant: "info",
  },
  {
    id: "evidence",
    titleKey: "agentLab.metrics.evidence.title",
    value: "5/6",
    metaKey: "agentLab.metrics.evidence.meta",
    variant: "success",
  },
  {
    id: "hypothesis",
    titleKey: "agentLab.metrics.hypothesis.title",
    value: "3",
    metaKey: "agentLab.metrics.hypothesis.meta",
    variant: "warning",
  },
] as const;

export const agentLabInputs = [
  {
    labelKey: "agentLab.inputs.marketStructure.label",
    valueKey: "agentLab.inputs.marketStructure.value",
    metaKey: "agentLab.inputs.marketStructure.meta",
    variant: "success",
  },
  {
    labelKey: "agentLab.inputs.liquidity.label",
    valueKey: "agentLab.inputs.liquidity.value",
    metaKey: "agentLab.inputs.liquidity.meta",
    variant: "success",
  },
  {
    labelKey: "agentLab.inputs.volatility.label",
    valueKey: "agentLab.inputs.volatility.value",
    metaKey: "agentLab.inputs.volatility.meta",
    variant: "warning",
  },
  {
    labelKey: "agentLab.inputs.regime.label",
    valueKey: "agentLab.inputs.regime.value",
    metaKey: "agentLab.inputs.regime.meta",
    variant: "info",
  },
] as const;

export const evidenceMatrix = [
  {
    id: "ma",
    titleKey: "agentLab.evidence.ma.title",
    detailKey: "agentLab.evidence.ma.detail",
    source: "K-line",
    weight: "High",
    variant: "success",
  },
  {
    id: "book",
    titleKey: "agentLab.evidence.book.title",
    detailKey: "agentLab.evidence.book.detail",
    source: "Order Book",
    weight: "High",
    variant: "success",
  },
  {
    id: "atr",
    titleKey: "agentLab.evidence.atr.title",
    detailKey: "agentLab.evidence.atr.detail",
    source: "ATR",
    weight: "Medium",
    variant: "warning",
  },
  {
    id: "audit",
    titleKey: "agentLab.evidence.audit.title",
    detailKey: "agentLab.evidence.audit.detail",
    source: "Audit",
    weight: "Required",
    variant: "info",
  },
] as const;

export const reasoningChecklist = [
  {
    step: "01",
    titleKey: "agentLab.reasoning.context.title",
    detailKey: "agentLab.reasoning.context.detail",
    statusKey: "agentLab.status.locked",
    variant: "success",
  },
  {
    step: "02",
    titleKey: "agentLab.reasoning.counter.title",
    detailKey: "agentLab.reasoning.counter.detail",
    statusKey: "agentLab.status.review",
    variant: "warning",
  },
  {
    step: "03",
    titleKey: "agentLab.reasoning.rule.title",
    detailKey: "agentLab.reasoning.rule.detail",
    statusKey: "agentLab.status.ready",
    variant: "info",
  },
] as const;

export const hypothesisCandidates = [
  {
    id: "continuation",
    rank: "A",
    titleKey: "agentLab.hypotheses.continuation.title",
    summaryKey: "agentLab.hypotheses.continuation.summary",
    score: "82",
    variant: "success",
    fields: [
      { labelKey: "agentLab.labels.trigger", valueKey: "agentLab.hypotheses.continuation.trigger" },
      { labelKey: "agentLab.labels.invalidation", valueKey: "agentLab.hypotheses.continuation.invalidation" },
      { labelKey: "agentLab.labels.risk", valueKey: "agentLab.hypotheses.continuation.risk" },
    ],
  },
  {
    id: "meanRevert",
    rank: "B",
    titleKey: "agentLab.hypotheses.meanRevert.title",
    summaryKey: "agentLab.hypotheses.meanRevert.summary",
    score: "64",
    variant: "warning",
    fields: [
      { labelKey: "agentLab.labels.trigger", valueKey: "agentLab.hypotheses.meanRevert.trigger" },
      { labelKey: "agentLab.labels.invalidation", valueKey: "agentLab.hypotheses.meanRevert.invalidation" },
      { labelKey: "agentLab.labels.risk", valueKey: "agentLab.hypotheses.meanRevert.risk" },
    ],
  },
  {
    id: "reject",
    rank: "C",
    titleKey: "agentLab.hypotheses.reject.title",
    summaryKey: "agentLab.hypotheses.reject.summary",
    score: "41",
    variant: "danger",
    fields: [
      { labelKey: "agentLab.labels.trigger", valueKey: "agentLab.hypotheses.reject.trigger" },
      { labelKey: "agentLab.labels.invalidation", valueKey: "agentLab.hypotheses.reject.invalidation" },
      { labelKey: "agentLab.labels.risk", valueKey: "agentLab.hypotheses.reject.risk" },
    ],
  },
] as const;

export const rulePacket = [
  {
    labelKey: "agentLab.rules.entry.label",
    valueKey: "agentLab.rules.entry.value",
    variant: "success",
  },
  {
    labelKey: "agentLab.rules.exit.label",
    valueKey: "agentLab.rules.exit.value",
    variant: "info",
  },
  {
    labelKey: "agentLab.rules.position.label",
    valueKey: "agentLab.rules.position.value",
    variant: "warning",
  },
  {
    labelKey: "agentLab.rules.audit.label",
    valueKey: "agentLab.rules.audit.value",
    variant: "neutral",
  },
] as const;

export const handoffChecklist = [
  {
    titleKey: "agentLab.handoff.rule.title",
    metaKey: "agentLab.handoff.rule.meta",
    complete: true,
  },
  {
    titleKey: "agentLab.handoff.backtest.title",
    metaKey: "agentLab.handoff.backtest.meta",
    complete: true,
  },
  {
    titleKey: "agentLab.handoff.risk.title",
    metaKey: "agentLab.handoff.risk.meta",
    complete: false,
  },
] as const;

export type AgentLabVariant = CommandCenterVariant;
