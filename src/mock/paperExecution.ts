export type PaperExecutionVariant = "success" | "warning" | "info" | "danger" | "neutral";

export const paperExecutionBrief = {
  symbol: "ETH/USDT",
  venue: "HTX",
  timeframe: "15m",
  modeKey: "paperExecution.status.paperOnly",
  questionKey: "paperExecution.brief.question",
  scopeKey: "paperExecution.brief.scope",
  decisionKey: "paperExecution.brief.decision",
} as const;

export const executionSafetyMetrics = [
  {
    id: "funds",
    titleKey: "paperExecution.metrics.funds.title",
    valueKey: "paperExecution.metrics.funds.value",
    metaKey: "paperExecution.metrics.funds.meta",
    variant: "info",
  },
  {
    id: "mode",
    titleKey: "paperExecution.metrics.mode.title",
    valueKey: "paperExecution.metrics.mode.value",
    metaKey: "paperExecution.metrics.mode.meta",
    variant: "success",
  },
  {
    id: "live",
    titleKey: "paperExecution.metrics.live.title",
    valueKey: "status.liveTradingDisabled",
    metaKey: "paperExecution.metrics.live.meta",
    variant: "danger",
  },
  {
    id: "audit",
    titleKey: "paperExecution.metrics.audit.title",
    valueKey: "paperExecution.metrics.audit.value",
    metaKey: "paperExecution.metrics.audit.meta",
    variant: "warning",
  },
] as const;

export const paperOrderTicket = [
  {
    labelKey: "paperExecution.ticket.symbol",
    value: "ETH/USDT",
  },
  {
    labelKey: "paperExecution.ticket.side",
    valueKey: "paperExecution.values.long",
  },
  {
    labelKey: "paperExecution.ticket.orderType",
    valueKey: "paperExecution.values.limit",
  },
  {
    labelKey: "paperExecution.ticket.entry",
    value: "3,446.20 USDT",
  },
  {
    labelKey: "paperExecution.ticket.size",
    value: "0.65 ETH",
  },
  {
    labelKey: "paperExecution.ticket.stop",
    value: "3,392.00 USDT",
  },
  {
    labelKey: "paperExecution.ticket.takeProfit",
    value: "3,544.60 USDT",
  },
  {
    labelKey: "paperExecution.ticket.route",
    valueKey: "paperExecution.values.simulatorRoute",
  },
] as const;

export const executionPreviewRows = [
  {
    id: "fill",
    labelKey: "paperExecution.preview.estimatedFill",
    value: "3,446.35 USDT",
    metaKey: "paperExecution.preview.estimatedFillMeta",
    variant: "info",
  },
  {
    id: "slippage",
    labelKey: "paperExecution.preview.slippage",
    value: "0.004%",
    metaKey: "paperExecution.preview.slippageMeta",
    variant: "success",
  },
  {
    id: "fees",
    labelKey: "paperExecution.preview.fees",
    value: "2.24 USDT",
    metaKey: "paperExecution.preview.feesMeta",
    variant: "neutral",
  },
  {
    id: "maxLoss",
    labelKey: "paperExecution.preview.maxSimulatedLoss",
    value: "35.23 USDT",
    metaKey: "paperExecution.preview.maxSimulatedLossMeta",
    variant: "warning",
  },
] as const;

export const activePaperPositions = [
  {
    id: "eth-001",
    symbol: "ETH/USDT",
    sideKey: "paperExecution.values.long",
    size: "0.65 ETH",
    entry: "3,446.35",
    mark: "3,458.90",
    pnl: "+8.16 USDT",
    statusKey: "paperExecution.status.simulatedOpen",
    variant: "success",
  },
  {
    id: "btc-watch",
    symbol: "BTC/USDT",
    sideKey: "paperExecution.values.noPosition",
    size: "0.00 BTC",
    entry: "-",
    mark: "103,240.10",
    pnl: "0.00 USDT",
    statusKey: "paperExecution.status.watchOnly",
    variant: "neutral",
  },
] as const;

export const executionLog = [
  {
    time: "22:18:04",
    titleKey: "paperExecution.log.orderCreated.title",
    metaKey: "paperExecution.log.orderCreated.meta",
    variant: "info",
  },
  {
    time: "22:18:06",
    titleKey: "paperExecution.log.safetyLock.title",
    metaKey: "paperExecution.log.safetyLock.meta",
    variant: "danger",
  },
  {
    time: "22:18:09",
    titleKey: "paperExecution.log.fillSimulated.title",
    metaKey: "paperExecution.log.fillSimulated.meta",
    variant: "success",
  },
  {
    time: "22:18:12",
    titleKey: "paperExecution.log.auditLinked.title",
    metaKey: "paperExecution.log.auditLinked.meta",
    variant: "warning",
  },
] as const;
