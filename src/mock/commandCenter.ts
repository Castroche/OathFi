export type CommandCenterVariant = "success" | "warning" | "info" | "danger" | "neutral";

export const commandCenterMetrics = [
  {
    id: "marketPulse",
    titleKey: "commandCenter.metrics.marketPulse.title",
    value: "ETH +2.35%",
    metaKey: "commandCenter.metrics.marketPulse.meta",
    variant: "success",
  },
  {
    id: "agentStatus",
    titleKey: "commandCenter.metrics.agentStatus.title",
    valueKey: "commandCenter.metrics.agentStatus.value",
    metaKey: "commandCenter.metrics.agentStatus.meta",
    variant: "success",
  },
  {
    id: "riskSummary",
    titleKey: "commandCenter.metrics.riskSummary.title",
    valueKey: "commandCenter.metrics.riskSummary.value",
    metaKey: "commandCenter.metrics.riskSummary.meta",
    variant: "warning",
  },
  {
    id: "activeEvents",
    titleKey: "commandCenter.metrics.activeEvents.title",
    value: "4",
    metaKey: "commandCenter.metrics.activeEvents.meta",
    variant: "info",
  },
] as const;

export const commandCenterLoop = [
  {
    id: "market",
    titleKey: "commandCenter.loop.market.title",
    value: "HTX ETH/USDT",
    metaKey: "commandCenter.loop.market.meta",
    variant: "success",
  },
  {
    id: "agent",
    titleKey: "commandCenter.loop.agent.title",
    valueKey: "commandCenter.loop.agent.value",
    metaKey: "commandCenter.loop.agent.meta",
    variant: "info",
  },
  {
    id: "risk",
    titleKey: "commandCenter.loop.risk.title",
    valueKey: "commandCenter.loop.risk.value",
    metaKey: "commandCenter.loop.risk.meta",
    variant: "warning",
  },
  {
    id: "opportunity",
    titleKey: "commandCenter.loop.opportunity.title",
    value: "0.82",
    metaKey: "commandCenter.loop.opportunity.meta",
    variant: "success",
  },
  {
    id: "audit",
    titleKey: "commandCenter.loop.audit.title",
    valueKey: "commandCenter.loop.audit.value",
    metaKey: "commandCenter.loop.audit.meta",
    variant: "neutral",
  },
] as const;

export const activeMarketEvents = [
  {
    symbol: "ETH/USDT",
    change: "+2.35%",
    titleKey: "commandCenter.marketEvents.ethBreakout.title",
    metaKey: "commandCenter.marketEvents.ethBreakout.meta",
    variant: "success",
  },
  {
    symbol: "BTC/USDT",
    change: "-1.23%",
    titleKey: "commandCenter.marketEvents.btcVolatility.title",
    metaKey: "commandCenter.marketEvents.btcVolatility.meta",
    variant: "danger",
  },
  {
    symbol: "HTX/USDT",
    change: "-0.74%",
    titleKey: "commandCenter.marketEvents.htxLiquidity.title",
    metaKey: "commandCenter.marketEvents.htxLiquidity.meta",
    variant: "warning",
  },
] as const;

export const mainOpportunity = {
  symbol: "ETH/USDT",
  score: "82/100",
  titleKey: "commandCenter.opportunity.title",
  thesisKey: "commandCenter.opportunity.thesis",
  triggerKey: "commandCenter.opportunity.trigger",
  invalidationKey: "commandCenter.opportunity.invalidation",
  riskKey: "commandCenter.opportunity.risk",
  actionKey: "commandCenter.opportunity.action",
};

export const recentDecisions = [
  {
    time: "14:26",
    titleKey: "commandCenter.decisions.hypothesis.title",
    metaKey: "commandCenter.decisions.hypothesis.meta",
    variant: "info",
  },
  {
    time: "14:24",
    titleKey: "commandCenter.decisions.backtest.title",
    metaKey: "commandCenter.decisions.backtest.meta",
    variant: "success",
  },
  {
    time: "14:22",
    titleKey: "commandCenter.decisions.risk.title",
    metaKey: "commandCenter.decisions.risk.meta",
    variant: "warning",
  },
] as const;

export const auditTrail = [
  {
    step: "01",
    titleKey: "commandCenter.audit.market.title",
    metaKey: "commandCenter.audit.market.meta",
  },
  {
    step: "02",
    titleKey: "commandCenter.audit.agent.title",
    metaKey: "commandCenter.audit.agent.meta",
  },
  {
    step: "03",
    titleKey: "commandCenter.audit.risk.title",
    metaKey: "commandCenter.audit.risk.meta",
  },
  {
    step: "04",
    titleKey: "commandCenter.audit.review.title",
    metaKey: "commandCenter.audit.review.meta",
  },
] as const;
