export type BacktestVariant = "success" | "warning" | "info" | "danger" | "neutral";

export const backtestBrief = {
  symbol: "ETH/USDT",
  venue: "HTX",
  timeframe: "15m",
  sample: "180D",
  modeKey: "backtestStudio.brief.mode",
  questionKey: "backtestStudio.brief.question",
  scopeKey: "backtestStudio.brief.scope",
};

export const strategyRules = [
  {
    labelKey: "backtestStudio.rules.entry.label",
    valueKey: "backtestStudio.rules.entry.value",
    variant: "success",
  },
  {
    labelKey: "backtestStudio.rules.exit.label",
    valueKey: "backtestStudio.rules.exit.value",
    variant: "info",
  },
  {
    labelKey: "backtestStudio.rules.risk.label",
    valueKey: "backtestStudio.rules.risk.value",
    variant: "warning",
  },
  {
    labelKey: "backtestStudio.rules.filter.label",
    valueKey: "backtestStudio.rules.filter.value",
    variant: "neutral",
  },
] as const;

export const backtestMetrics = [
  {
    id: "winRate",
    titleKey: "backtestStudio.metrics.winRate.title",
    value: "57.8%",
    metaKey: "backtestStudio.metrics.winRate.meta",
    variant: "success",
  },
  {
    id: "profitFactor",
    titleKey: "backtestStudio.metrics.profitFactor.title",
    value: "1.84",
    metaKey: "backtestStudio.metrics.profitFactor.meta",
    variant: "success",
  },
  {
    id: "expectedValue",
    titleKey: "backtestStudio.metrics.expectedValue.title",
    value: "+0.42R",
    metaKey: "backtestStudio.metrics.expectedValue.meta",
    variant: "success",
  },
  {
    id: "maxDrawdown",
    titleKey: "backtestStudio.metrics.maxDrawdown.title",
    value: "-6.8%",
    metaKey: "backtestStudio.metrics.maxDrawdown.meta",
    variant: "warning",
  },
  {
    id: "totalTrades",
    titleKey: "backtestStudio.metrics.totalTrades.title",
    value: "128",
    metaKey: "backtestStudio.metrics.totalTrades.meta",
    variant: "info",
  },
  {
    id: "averageRr",
    titleKey: "backtestStudio.metrics.averageRr.title",
    value: "1.72",
    metaKey: "backtestStudio.metrics.averageRr.meta",
    variant: "info",
  },
  {
    id: "sampleQuality",
    titleKey: "backtestStudio.metrics.sampleQuality.title",
    value: "A-",
    metaKey: "backtestStudio.metrics.sampleQuality.meta",
    variant: "success",
  },
  {
    id: "sharpeRatio",
    titleKey: "backtestStudio.metrics.sharpeRatio.title",
    value: "1.38",
    metaKey: "backtestStudio.metrics.sharpeRatio.meta",
    variant: "success",
  },
] as const;

export const verdictChecks = [
  {
    titleKey: "backtestStudio.verdict.checks.edge.title",
    valueKey: "backtestStudio.verdict.checks.edge.value",
    variant: "success",
  },
  {
    titleKey: "backtestStudio.verdict.checks.drawdown.title",
    valueKey: "backtestStudio.verdict.checks.drawdown.value",
    variant: "warning",
  },
  {
    titleKey: "backtestStudio.verdict.checks.sample.title",
    valueKey: "backtestStudio.verdict.checks.sample.value",
    variant: "success",
  },
] as const;

export const equityCurve = [
  { label: "D1", value: 100000 },
  { label: "D20", value: 100840 },
  { label: "D40", value: 99520 },
  { label: "D60", value: 102420 },
  { label: "D80", value: 104160 },
  { label: "D100", value: 103480 },
  { label: "D120", value: 106920 },
  { label: "D140", value: 108640 },
  { label: "D160", value: 110380 },
  { label: "D180", value: 112610 },
] as const;

export const drawdownCurve = [
  { label: "D1", value: 0 },
  { label: "D20", value: -1.4 },
  { label: "D40", value: -5.2 },
  { label: "D60", value: -2.6 },
  { label: "D80", value: -3.1 },
  { label: "D100", value: -6.8 },
  { label: "D120", value: -2.7 },
  { label: "D140", value: -1.9 },
  { label: "D160", value: -3.4 },
  { label: "D180", value: -1.2 },
] as const;

export const tradeDistribution = [
  { label: "-2R", wins: 0, losses: 9 },
  { label: "-1R", wins: 0, losses: 22 },
  { label: "0R", wins: 8, losses: 7 },
  { label: "+1R", wins: 29, losses: 0 },
  { label: "+2R", wins: 18, losses: 0 },
  { label: "+3R", wins: 8, losses: 0 },
] as const;

export const tradeList = [
  {
    time: "2026-06-14 13:45",
    sideKey: "backtestStudio.tradeSides.long",
    entry: "3,446.20",
    exit: "3,508.40",
    pnl: "+1.82R",
    rr: "1.80",
    statusKey: "backtestStudio.tradeStatus.takeProfit",
    variant: "success",
  },
  {
    time: "2026-06-12 09:15",
    sideKey: "backtestStudio.tradeSides.long",
    entry: "3,392.80",
    exit: "3,354.30",
    pnl: "-1.00R",
    rr: "1.80",
    statusKey: "backtestStudio.tradeStatus.stopLoss",
    variant: "danger",
  },
  {
    time: "2026-06-09 18:30",
    sideKey: "backtestStudio.tradeSides.long",
    entry: "3,318.60",
    exit: "3,379.90",
    pnl: "+1.64R",
    rr: "1.70",
    statusKey: "backtestStudio.tradeStatus.momentumFade",
    variant: "success",
  },
  {
    time: "2026-06-07 21:00",
    sideKey: "backtestStudio.tradeSides.long",
    entry: "3,286.40",
    exit: "3,274.10",
    pnl: "-0.34R",
    rr: "1.60",
    statusKey: "backtestStudio.tradeStatus.ruleExit",
    variant: "warning",
  },
  {
    time: "2026-06-04 11:45",
    sideKey: "backtestStudio.tradeSides.long",
    entry: "3,201.80",
    exit: "3,264.50",
    pnl: "+1.96R",
    rr: "1.90",
    statusKey: "backtestStudio.tradeStatus.takeProfit",
    variant: "success",
  },
] as const;
