export type RiskFirewallVariant = "success" | "warning" | "info" | "danger" | "neutral";

export const riskFirewallBrief = {
  symbol: "ETH/USDT",
  venue: "HTX",
  timeframe: "15m",
  decisionKey: "riskFirewall.decision.value",
  questionKey: "riskFirewall.brief.question",
  scopeKey: "riskFirewall.brief.scope",
};

export const riskDecisionMetrics = [
  {
    id: "riskLevel",
    titleKey: "riskFirewall.metrics.riskLevel.title",
    valueKey: "riskFirewall.metrics.riskLevel.value",
    metaKey: "riskFirewall.metrics.riskLevel.meta",
    variant: "warning",
  },
  {
    id: "decision",
    titleKey: "riskFirewall.metrics.decision.title",
    valueKey: "riskFirewall.metrics.decision.value",
    metaKey: "riskFirewall.metrics.decision.meta",
    variant: "success",
  },
  {
    id: "rules",
    titleKey: "riskFirewall.metrics.rules.title",
    value: "7 PASS / 1 WARNING / 0 FAIL",
    metaKey: "riskFirewall.metrics.rules.meta",
    variant: "info",
  },
  {
    id: "liveStatus",
    titleKey: "riskFirewall.metrics.liveStatus.title",
    valueKey: "status.liveTradingDisabled",
    metaKey: "riskFirewall.metrics.liveStatus.meta",
    variant: "danger",
  },
] as const;

export const positionSizingRows = [
  {
    labelKey: "riskFirewall.position.accountEquity",
    value: "100,000 USDT",
    metaKey: "riskFirewall.position.accountEquityMeta",
  },
  {
    labelKey: "riskFirewall.position.riskPerTrade",
    value: "1.1%",
    metaKey: "riskFirewall.position.riskPerTradeMeta",
  },
  {
    labelKey: "riskFirewall.position.suggestedSize",
    value: "0.65 ETH",
    metaKey: "riskFirewall.position.suggestedSizeMeta",
  },
  {
    labelKey: "riskFirewall.position.maxLoss",
    value: "1,100 USDT",
    metaKey: "riskFirewall.position.maxLossMeta",
  },
] as const;

export const riskRuleEvaluations = [
  {
    id: "executionMode",
    ruleKey: "riskFirewall.rules.executionMode.rule",
    thresholdKey: "riskFirewall.rules.executionMode.threshold",
    actualKey: "riskFirewall.rules.executionMode.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.executionMode.notes",
    variant: "success",
  },
  {
    id: "accountRisk",
    ruleKey: "riskFirewall.rules.accountRisk.rule",
    thresholdKey: "riskFirewall.rules.accountRisk.threshold",
    actualKey: "riskFirewall.rules.accountRisk.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.accountRisk.notes",
    variant: "success",
  },
  {
    id: "positionCap",
    ruleKey: "riskFirewall.rules.positionCap.rule",
    thresholdKey: "riskFirewall.rules.positionCap.threshold",
    actualKey: "riskFirewall.rules.positionCap.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.positionCap.notes",
    variant: "success",
  },
  {
    id: "drawdown",
    ruleKey: "riskFirewall.rules.drawdown.rule",
    thresholdKey: "riskFirewall.rules.drawdown.threshold",
    actualKey: "riskFirewall.rules.drawdown.actual",
    status: "WARNING",
    notesKey: "riskFirewall.rules.drawdown.notes",
    variant: "warning",
  },
  {
    id: "liquidity",
    ruleKey: "riskFirewall.rules.liquidity.rule",
    thresholdKey: "riskFirewall.rules.liquidity.threshold",
    actualKey: "riskFirewall.rules.liquidity.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.liquidity.notes",
    variant: "success",
  },
  {
    id: "volatility",
    ruleKey: "riskFirewall.rules.volatility.rule",
    thresholdKey: "riskFirewall.rules.volatility.threshold",
    actualKey: "riskFirewall.rules.volatility.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.volatility.notes",
    variant: "success",
  },
  {
    id: "stopLoss",
    ruleKey: "riskFirewall.rules.stopLoss.rule",
    thresholdKey: "riskFirewall.rules.stopLoss.threshold",
    actualKey: "riskFirewall.rules.stopLoss.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.stopLoss.notes",
    variant: "success",
  },
  {
    id: "audit",
    ruleKey: "riskFirewall.rules.audit.rule",
    thresholdKey: "riskFirewall.rules.audit.threshold",
    actualKey: "riskFirewall.rules.audit.actual",
    status: "PASS",
    notesKey: "riskFirewall.rules.audit.notes",
    variant: "success",
  },
] as const;

export const finalRiskDecision = {
  statusKey: "riskFirewall.final.status",
  titleKey: "riskFirewall.final.title",
  summaryKey: "riskFirewall.final.summary",
  controls: [
    "riskFirewall.final.controls.paperOnly",
    "riskFirewall.final.controls.sizeCap",
    "riskFirewall.final.controls.stop",
    "riskFirewall.final.controls.audit",
  ],
} as const;
