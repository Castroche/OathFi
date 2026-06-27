export const tickerChips = [
  {
    symbol: "BTC/USDT",
    price: "67,241.8",
    change: "-1.23%",
    direction: "down",
  },
  {
    symbol: "ETH/USDT",
    price: "3,412.67",
    change: "+2.35%",
    direction: "up",
  },
  {
    symbol: "HTX/USDT",
    price: "0.00000182",
    change: "-0.74%",
    direction: "down",
  },
] as const;

export type MarketVariant = "success" | "warning" | "info" | "danger" | "neutral";

export const marketHeaderStats = [
  {
    labelKey: "marketMonitor.header.lastPrice",
    value: "3,412.67",
    meta: "+2.35%",
    variant: "success",
  },
  {
    labelKey: "marketMonitor.header.volume24h",
    value: "842.6M",
    meta: "USDT",
    variant: "info",
  },
  {
    labelKey: "marketMonitor.header.spread",
    value: "0.018%",
    meta: "0.62 USDT",
    variant: "success",
  },
  {
    labelKey: "marketMonitor.header.liquidity",
    value: "92/100",
    metaKey: "marketMonitor.status.deepBook",
    variant: "success",
  },
] as const;

export const timeframeTabs = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export const candles = [
  { time: "09:00", open: 3378, high: 3388, low: 3362, close: 3370, volume: 48, ma20: 3365, ma50: 3342, ma200: 3298 },
  { time: "09:15", open: 3370, high: 3396, low: 3364, close: 3390, volume: 58, ma20: 3369, ma50: 3348, ma200: 3302 },
  { time: "09:30", open: 3390, high: 3408, low: 3384, close: 3398, volume: 63, ma20: 3375, ma50: 3354, ma200: 3307 },
  { time: "09:45", open: 3398, high: 3410, low: 3380, close: 3386, volume: 54, ma20: 3379, ma50: 3359, ma200: 3312 },
  { time: "10:00", open: 3386, high: 3418, low: 3381, close: 3412, volume: 78, ma20: 3386, ma50: 3365, ma200: 3316 },
  { time: "10:15", open: 3412, high: 3426, low: 3401, close: 3420, volume: 85, ma20: 3393, ma50: 3371, ma200: 3321 },
  { time: "10:30", open: 3420, high: 3424, low: 3398, close: 3404, volume: 69, ma20: 3397, ma50: 3376, ma200: 3326 },
  { time: "10:45", open: 3404, high: 3433, low: 3396, close: 3428, volume: 92, ma20: 3405, ma50: 3382, ma200: 3331 },
  { time: "11:00", open: 3428, high: 3454, low: 3420, close: 3446, volume: 118, ma20: 3414, ma50: 3389, ma200: 3336 },
  { time: "11:15", open: 3446, high: 3460, low: 3429, close: 3436, volume: 96, ma20: 3420, ma50: 3395, ma200: 3342 },
  { time: "11:30", open: 3436, high: 3450, low: 3414, close: 3422, volume: 84, ma20: 3425, ma50: 3401, ma200: 3348 },
  { time: "11:45", open: 3422, high: 3458, low: 3418, close: 3452, volume: 132, ma20: 3432, ma50: 3408, ma200: 3355 },
  { time: "12:00", open: 3452, high: 3467, low: 3438, close: 3444, volume: 91, ma20: 3438, ma50: 3414, ma200: 3360 },
  { time: "12:15", open: 3444, high: 3478, low: 3439, close: 3472, volume: 146, ma20: 3447, ma50: 3421, ma200: 3367 },
  { time: "12:30", open: 3472, high: 3484, low: 3458, close: 3462, volume: 103, ma20: 3452, ma50: 3427, ma200: 3374 },
  { time: "12:45", open: 3462, high: 3492, low: 3454, close: 3488, volume: 156, ma20: 3460, ma50: 3435, ma200: 3380 },
  { time: "13:00", open: 3488, high: 3504, low: 3476, close: 3496, volume: 168, ma20: 3469, ma50: 3442, ma200: 3388 },
  { time: "13:15", open: 3496, high: 3501, low: 3468, close: 3478, volume: 121, ma20: 3474, ma50: 3448, ma200: 3395 },
  { time: "13:30", open: 3478, high: 3498, low: 3465, close: 3492, volume: 134, ma20: 3480, ma50: 3455, ma200: 3402 },
  { time: "13:45", open: 3492, high: 3518, low: 3486, close: 3512, volume: 184, ma20: 3488, ma50: 3462, ma200: 3408 },
] as const;

export const chartEvents = [
  { index: 8, labelKey: "marketMonitor.events.volumeSpike.short", variant: "warning" },
  { index: 13, labelKey: "marketMonitor.events.breakoutWatch.short", variant: "success" },
  { index: 19, labelKey: "marketMonitor.events.agentAnalysis.short", variant: "info" },
] as const;

export const orderBookRows = [
  { side: "ask", price: "3,415.42", size: "18.42", total: "62,903", depth: 92 },
  { side: "ask", price: "3,414.86", size: "12.76", total: "43,575", depth: 72 },
  { side: "ask", price: "3,414.20", size: "9.84", total: "33,604", depth: 58 },
  { side: "ask", price: "3,413.72", size: "6.19", total: "21,135", depth: 39 },
  { side: "ask", price: "3,413.28", size: "4.66", total: "15,907", depth: 28 },
  { side: "bid", price: "3,412.66", size: "7.92", total: "27,025", depth: 44 },
  { side: "bid", price: "3,412.18", size: "13.38", total: "45,656", depth: 69 },
  { side: "bid", price: "3,411.74", size: "19.91", total: "67,936", depth: 96 },
  { side: "bid", price: "3,411.05", size: "15.27", total: "52,088", depth: 76 },
  { side: "bid", price: "3,410.62", size: "10.64", total: "36,290", depth: 55 },
] as const;

export const trades = [
  { time: "13:45:18", side: "buy", price: "3,412.67", size: "2.48", variant: "success" },
  { time: "13:45:14", side: "sell", price: "3,412.42", size: "0.91", variant: "danger" },
  { time: "13:45:09", side: "buy", price: "3,412.88", size: "4.12", variant: "success" },
  { time: "13:45:03", side: "buy", price: "3,412.73", size: "1.65", variant: "success" },
  { time: "13:44:57", side: "sell", price: "3,411.98", size: "3.04", variant: "danger" },
  { time: "13:44:52", side: "buy", price: "3,412.31", size: "0.72", variant: "success" },
  { time: "13:44:46", side: "sell", price: "3,411.86", size: "1.18", variant: "danger" },
  { time: "13:44:40", side: "buy", price: "3,412.54", size: "5.76", variant: "success" },
] as const;

export const indicators = [
  {
    labelKey: "marketMonitor.indicators.rsi",
    value: "58.4",
    metaKey: "marketMonitor.indicators.rsiMeta",
    variant: "success",
  },
  {
    labelKey: "marketMonitor.indicators.macd",
    value: "+14.2",
    metaKey: "marketMonitor.indicators.macdMeta",
    variant: "success",
  },
  {
    labelKey: "marketMonitor.indicators.atr",
    value: "42.8",
    metaKey: "marketMonitor.indicators.atrMeta",
    variant: "warning",
  },
  {
    labelKey: "marketMonitor.indicators.vwap",
    value: "3,392.10",
    metaKey: "marketMonitor.indicators.vwapMeta",
    variant: "info",
  },
  {
    labelKey: "marketMonitor.indicators.depth",
    value: "+18.7%",
    metaKey: "marketMonitor.indicators.depthMeta",
    variant: "success",
  },
  {
    labelKey: "marketMonitor.indicators.trend",
    value: "72/100",
    metaKey: "marketMonitor.indicators.trendMeta",
    variant: "success",
  },
] as const;

export const marketEventTimeline = [
  {
    time: "13:45",
    titleKey: "marketMonitor.events.agentAnalysis.title",
    metaKey: "marketMonitor.events.agentAnalysis.meta",
    variant: "info",
  },
  {
    time: "13:32",
    titleKey: "marketMonitor.events.breakoutWatch.title",
    metaKey: "marketMonitor.events.breakoutWatch.meta",
    variant: "success",
  },
  {
    time: "12:56",
    titleKey: "marketMonitor.events.volumeSpike.title",
    metaKey: "marketMonitor.events.volumeSpike.meta",
    variant: "warning",
  },
  {
    time: "12:18",
    titleKey: "marketMonitor.events.riskAlert.title",
    metaKey: "marketMonitor.events.riskAlert.meta",
    variant: "danger",
  },
] as const;
