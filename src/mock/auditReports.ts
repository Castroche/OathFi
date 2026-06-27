export type AuditReportVariant = "success" | "warning" | "info" | "danger" | "neutral";

export const auditReportMetrics = [
  {
    id: "reports",
    titleKey: "auditReports.metrics.reports.title",
    value: "5",
    metaKey: "auditReports.metrics.reports.meta",
    variant: "info",
  },
  {
    id: "coverage",
    titleKey: "auditReports.metrics.coverage.title",
    value: "6/6",
    metaKey: "auditReports.metrics.coverage.meta",
    variant: "success",
  },
  {
    id: "exceptions",
    titleKey: "auditReports.metrics.exceptions.title",
    value: "1",
    metaKey: "auditReports.metrics.exceptions.meta",
    variant: "warning",
  },
  {
    id: "live",
    titleKey: "auditReports.metrics.live.title",
    valueKey: "status.liveTradingDisabled",
    metaKey: "auditReports.metrics.live.meta",
    variant: "danger",
  },
] as const;

export const auditReports = [
  {
    id: "OATH-2026-0618-ETH-001",
    symbol: "ETH/USDT",
    time: "2026-06-18 22:24",
    titleKey: "auditReports.reports.ethBreakout.title",
    summaryKey: "auditReports.reports.ethBreakout.summary",
    statusKey: "auditReports.status.reviewComplete",
    variant: "success",
    referencedNews: ["mock-crypto-positive-mainnet", "mock-risk-hard-block-bridge"],
    referencedOnChainAlerts: ["mock-onchain-whale-transfer"],
  },
  {
    id: "OATH-2026-0618-BTC-002",
    symbol: "BTC/USDT",
    time: "2026-06-18 21:40",
    titleKey: "auditReports.reports.btcVolatility.title",
    summaryKey: "auditReports.reports.btcVolatility.summary",
    statusKey: "auditReports.status.needsReview",
    variant: "warning",
    referencedNews: ["mock-macro-fed-cpi", "mock-risk-stablecoin-depeg"],
    referencedOnChainAlerts: ["mock-onchain-exchange-inflow"],
  },
  {
    id: "OATH-2026-0618-HTX-003",
    symbol: "HTX/USDT",
    time: "2026-06-18 20:55",
    titleKey: "auditReports.reports.htxLiquidity.title",
    summaryKey: "auditReports.reports.htxLiquidity.summary",
    statusKey: "auditReports.status.watchOnly",
    variant: "info",
    referencedNews: ["mock-htx-listing", "mock-htx-withdrawal-maintenance"],
    referencedOnChainAlerts: [],
  },
] as const;

export const auditReportSections = [
  {
    id: "marketEvent",
    titleKey: "auditReports.sections.marketEvent",
    valueKey: "auditReports.detail.marketEvent.value",
    metaKey: "auditReports.detail.marketEvent.meta",
    evidence: "ME-ETH-7781",
    variant: "info",
  },
  {
    id: "agentHypothesis",
    titleKey: "auditReports.sections.agentHypothesis",
    valueKey: "auditReports.detail.agentHypothesis.value",
    metaKey: "auditReports.detail.agentHypothesis.meta",
    evidence: "AI-HYP-A",
    variant: "success",
  },
  {
    id: "backtestResult",
    titleKey: "auditReports.sections.backtestResult",
    valueKey: "auditReports.detail.backtestResult.value",
    metaKey: "auditReports.detail.backtestResult.meta",
    evidence: "BT-180D-128",
    variant: "success",
  },
  {
    id: "riskFirewall",
    titleKey: "auditReports.sections.riskFirewall",
    valueKey: "auditReports.detail.riskFirewall.value",
    metaKey: "auditReports.detail.riskFirewall.meta",
    evidence: "RF-PAPER-ONLY",
    variant: "warning",
  },
  {
    id: "execution",
    titleKey: "auditReports.sections.execution",
    valueKey: "auditReports.detail.execution.value",
    metaKey: "auditReports.detail.execution.meta",
    evidence: "PX-SIM-224",
    variant: "info",
  },
  {
    id: "review",
    titleKey: "auditReports.sections.review",
    valueKey: "auditReports.detail.review.value",
    metaKey: "auditReports.detail.review.meta",
    evidence: "RV-COMPLETE",
    variant: "success",
  },
] as const;

export const auditLogEntries = [
  {
    time: "22:18:04",
    actorKey: "auditReports.log.actors.market",
    titleKey: "auditReports.log.market.title",
    hash: "0x7A9C...E21F",
    variant: "info",
  },
  {
    time: "22:18:07",
    actorKey: "auditReports.log.actors.agent",
    titleKey: "auditReports.log.agent.title",
    hash: "0x82DB...91AF",
    variant: "success",
  },
  {
    time: "22:18:10",
    actorKey: "auditReports.log.actors.backtest",
    titleKey: "auditReports.log.backtest.title",
    hash: "0x115C...4C02",
    variant: "success",
  },
  {
    time: "22:18:12",
    actorKey: "auditReports.log.actors.risk",
    titleKey: "auditReports.log.risk.title",
    hash: "0xCE10...A477",
    variant: "warning",
  },
  {
    time: "22:18:16",
    actorKey: "auditReports.log.actors.execution",
    titleKey: "auditReports.log.execution.title",
    hash: "0x5E01...66BA",
    variant: "info",
  },
  {
    time: "22:18:22",
    actorKey: "auditReports.log.actors.review",
    titleKey: "auditReports.log.review.title",
    hash: "0x40AF...19D8",
    variant: "success",
  },
] as const;
