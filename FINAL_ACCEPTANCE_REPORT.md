# OathFi Professional K-Line Workspace Acceptance Report

Date: 2026-06-19

## Modified Files

- `src/components/market/ProKlineTerminal.tsx`
- `src/components/market/LiveOrderBook.tsx`
- `src/components/market/LiveTradesStream.tsx`
- `src/styles/global.css`
- `src/i18n/messages/en.json`
- `src/i18n/messages/zh-CN.json`
- `FINAL_ACCEPTANCE_REPORT.md`

## Indicator Manager / Unified Engine

Implemented a unified indicator engine around `IndicatorDefinition` and `IndicatorInstance`.

- Definitions cover MA, EMA, BOLL, VWAP, SAR, VOL, MACD, RSI, KDJ, ATR, OBV, WR, CCI.
- Each definition includes `kind`, `label`, `placement`, `defaultParams`, and `allowDuplicate`.
- Each instance uses a stable UUID-style id independent from params.
- UI tags, pane assignment, chart indicator ids, settings state, and deletion now derive from `IndicatorInstance`.
- All toolbar buttons route through `addIndicator(kind, params)`.
- `renderIndicator(instance)` dispatches to `renderMA`, `renderEMA`, `renderBOLL`, `renderVWAP`, `renderSAR`, `renderVOL`, `renderMACD`, `renderRSI`, `renderKDJ`, `renderATR`, `renderOBV`, `renderWR`, and `renderCCI`.
- `removeIndicator(instanceId)` removes every managed series id from the chart registry and removes empty sub panes.
- `clearIndicators()` removes all managed indicator ids, sub panes, registry entries, and UI tags.
- Switching symbol/timeframe updates KLineCharts symbol/period/data without re-adding indicators or recreating panes.

## Indicator Parameter Engine

Added `INDICATOR_PARAM_SCHEMAS` for every supported indicator.

- MA: period/source/offset, default `MA(10)`.
- EMA: period/source/offset, default `EMA(20)`.
- BOLL: period/stdDev/source/basisType.
- VWAP: anchor/source.
- SAR: step/max.
- VOL: showMA/ma1/ma2.
- MACD: fast/slow/signal/source with `fast < slow` validation.
- RSI: period/source/overbought/oversold.
- KDJ: period/kSmoothing/dSmoothing.
- ATR, OBV, WR, CCI: schema-backed params.

`updateIndicatorParams(instanceId, nextParams)` validates params, regenerates the label, and calls `overrideIndicator` for the existing chart indicator id. It does not create a new chart, pane, or duplicate series.

Browser acceptance confirmed:

- Clicking MA adds one `MA(10)` instance.
- `MA(10)` can be edited to `MA(20)`.
- `MA(10)`, `MA(20)`, and `MA(60)` can coexist as separate instances.
- Deleting `MA(20)` leaves `MA(10)` and `MA(60)`.
- EMA, BOLL, VWAP, MACD, RSI, KDJ, ATR, OBV, WR, and CCI all open the parameter settings panel.
- Chinese settings panel labels include `设置`, `保存`, `取消`, `周期`, and `数据源`.

## Placement Rules

- Main overlay: MA, EMA, BOLL, VWAP, SAR.
- Volume pane: VOL.
- Sub pane: MACD, RSI, KDJ, ATR, OBV, WR, CCI.

The engine assigns:

- `main` -> `paneId: "candle_pane"`
- `volume` -> `paneId: "volume_pane"`
- `sub` -> `paneId: "indicator:<instanceId>"`

## Indicator Add/Delete Tests

Browser acceptance in Chinese UI confirmed:

- MA add, duplicate click, delete: pass.
- EMA add, duplicate click, delete: pass.
- BOLL add, duplicate click, delete: pass.
- VWAP add, duplicate click, delete: pass.
- SAR add, duplicate click, delete: pass.
- VOL add, duplicate click, delete: pass.
- MACD add, duplicate click, delete: pass.
- RSI add, duplicate click, delete: pass.
- KDJ add, duplicate click, delete: pass.
- ATR add, duplicate click, delete: pass.
- OBV add, duplicate click, delete: pass.
- WR add, duplicate click, delete: pass.
- CCI add, duplicate click, delete: pass.

Duplicate clicks kept one instance per `kind + params`. Clear all removed all tags. Timeframe and symbol switches preserved the existing indicator instances without duplication.

## Screenshot Paths

- Main overlay indicators MA / EMA / BOLL / VWAP / SAR: `F:\OathFi\output\acceptance\indicator-main-overlays.png`
- Sub pane indicators MACD / RSI / KDJ / ATR: `F:\OathFi\output\acceptance\indicator-sub-panes.png`

## Order Book Precision / Aggregation

Implemented order book aggregation as a memoized display selector.

- UI label changed to `聚合粒度`.
- Auto label changed to `自动`.
- Default value is `auto`, persisted per symbol.
- Auto tick uses exchange precision fallback rules: ETH 0.01, BTC 0.1, HTX 0.000000001, other symbols 0.01 or symbol precision.
- Bids aggregate with `Math.floor`.
- Asks aggregate with `Math.ceil`.
- Aggregated bucket size and total are recalculated from display buckets.
- Spread is recalculated from aggregated best ask/bid.
- Raw order book data is not mutated.
- Display pads sparse aggregated books to at least 12 asks and 12 bids.

Precision test results:

- ETH/USDT: options `自动, 0.01, 0.1, 1, 10`; default `自动`; auto displayed 12 asks / 12 bids; default prices were decimal, not integer-only.
- BTC/USDT: options `自动, 0.1, 1, 10, 100`; default `自动`; auto displayed 12 asks / 12 bids.
- HTX/USDT: options `自动, 0.000000001, 0.00000001, 0.0000001, 0.000001`; default `自动`; auto displayed 12 asks / 12 bids with tiny decimal prices.
- Changing ETH 0.01 -> 0.1 -> 1 changed bucket prices, row grouping, and spread.
- Changing BTC 0.1 -> 1 -> 10 changed bucket prices, row grouping, and spread.

## Large Trades

Replaced recent trade stream with in-memory large-trade stream.

- Title: `最新大额成交`.
- Empty state: `暂无大额成交`.
- No cached-count text is rendered.
- No localStorage/indexedDB/history persistence is used for trades.
- Keeps latest 15 rows in component state.
- Clears the component list on symbol switch.
- Thresholds: ETH/USDT 5000 USDT, BTC/USDT 10000 USDT, other symbols 3000 USDT.
- Rows with `price * amount` below threshold are filtered out.

Browser result: ETH showed at most 15 rows; BTC showed fewer than 15 rows; HTX showed `暂无大额成交`.

## Layout / Performance

- K-line workspace uses viewport-bounded layout.
- Main chart panel, right sidebar, chart host, order book, and trades panel have `min-height: 0`.
- Right-side order book and trades panels use internal overflow instead of expanding the page.
- Chart host has explicit responsive height so KLineCharts never initializes a zero-height canvas.
- Indicator operations use KLineCharts indicator lifecycle instead of rebuilding the chart instance.
- Order book aggregation is memoized from `orderBook + selectedTickSize`.
- Large trades are filtered in a scoped component state and capped at 15 rows.

Browser smoke ran repeated add/delete/clear/symbol/timeframe operations without console errors.

## Acceptance Checklist

1. Click any indicator and it appears only in its defined placement: pass.
2. MA, EMA, BOLL, VWAP, SAR overlay the main chart: pass.
3. VOL appears only in the volume area: pass.
4. MACD, RSI, KDJ, ATR, OBV, WR, CCI create sub panes: pass.
5. Repeated clicks do not duplicate the same indicator: pass.
6. Deleting MA removes the complete MA indicator: pass.
7. Deleting EMA removes the complete EMA indicator: pass.
8. Deleting BOLL removes upper/middle/lower together: pass.
9. Deleting VWAP removes VWAP: pass.
10. Deleting MACD removes DIF/DEA/histogram and its sub pane: pass.
11. Deleting RSI/KDJ/ATR/OBV/WR/CCI removes the corresponding lines and sub pane: pass.
12. Clear all leaves no indicator tags or managed panes: pass.
13. Switching timeframe or symbol does not duplicate indicators: pass.
14. Chinese UI no longer shows `INDICATORS`, `Clear all`, `Precision`, `Auto`, or `Kline 终端`: pass.
15. Order book default aggregation is `自动`, not `1`: pass.
16. ETH/USDT default order book is not integer-only: pass.
17. Latest large trades show at most 15 rows: pass.
18. Page bottom has no large blank order-book/trade expansion area; right panels stay internally bounded: pass.

## Build / Lint

- `npm run lint`: pass.
- `npm run build`: pass.
- Build emitted only the existing Vite chunk-size warning for a bundle over 500 kB.

## News Intelligence Acceptance Addendum

Date: 2026-06-19

### Modified Files

- `src/lib/workflow.ts`
- `src/components/market/MarketMonitorContent.tsx`
- `src/components/market/ResizableMarketWorkspace.tsx`
- `src/pages/PageWorkspace.tsx`
- `src/components/risk/RiskFirewallContent.tsx`
- `src/components/audit/AuditReportsContent.tsx`
- `src/mock/auditReports.ts`
- `src/styles/global.css`
- `src/i18n/messages/en.json`
- `src/i18n/messages/zh-CN.json`
- `FINAL_ACCEPTANCE_REPORT.md`

### New Components

- `src/components/news/NewsIntelligencePanel.tsx`
- `src/components/news/NewsFeedList.tsx`
- `src/components/news/NewsItemCard.tsx`
- `src/components/news/NewsFilterTabs.tsx`
- `src/components/news/NewsRiskBadge.tsx`
- `src/components/news/NewsSourceStatus.tsx`
- `src/components/news/NewsImpactSummary.tsx`

### New Store / Services

- `src/stores/newsIntelligenceStore.ts`
- `src/services/news/newsTypes.ts`
- `src/services/news/newsAdapters.ts`
- `src/services/news/newsNormalizer.ts`
- `src/services/news/newsClassifier.ts`
- `src/services/news/newsMock.ts`
- `src/services/news/newsSelectors.ts`

### News Data Structure

Implemented `NormalizedNewsItem` with the required fields: id, title, summary, source, url, publishedAt, fetchedAt, category, related symbols/chains/projects, severity, sentiment, reliability, freshness, newsRisk, newsSupport, macroRisk, onChainRisk, hardBlock, hardBlockReason, tags, isLive, isMock, and sourceStatus.

Implemented `NewsRiskContext` output with neutral fallback:

- `newsRisk = 0`
- `newsSupport = 0`
- `macroRisk = 0`
- `onChainRisk = 0`
- `hardBlockEvent = false`
- `warnings = []`

### Source Adapter Architecture

Added source adapter metadata for:

- OathFi Mock Feed: `mock`
- BlockBeats: `backend-required`
- Jinshi Data: `backend-required`
- Sina Finance: `planned`
- HTX Official Announcements: `backend-required`
- WuBlockchain: `planned`
- CoinDesk: `planned`
- Cointelegraph: `planned`
- The Block: `backend-required`
- Official Macro Data Sources: `planned`
- On-chain Alert Sources: `backend-required`

No source is falsely labeled live. No external AI API, real trading API, account API, API key, secret, backend database, scraper, withdrawal, or order placement logic was added.

### Mock / Planned / Backend-Required Status

Created 10 mock news/intelligence items. Every mock item has:

- `isMock: true`
- `sourceStatus: "mock"`

The Market Monitor News & On-chain Intelligence panel shows source adapter statuses, including `Mock`, `Planned`, and `Backend Required`.

### News Classification

Rule-based classification supports:

- Crypto / Web3
- On-chain Alerts
- Macro Events
- Funding / VC
- HTX Ecosystem
- Risk Events

Keyword rules populate `newsRisk`, `newsSupport`, `macroRisk`, `onChainRisk`, `hardBlock`, `hardBlockReason`, and `tags`. Freshness uses `exp(-AgeHours / HalfLifeHours)` with category-specific half-life values.

### HardBlock Example

`mock-risk-hard-block-bridge` is a hard block example:

- Title: `Bridge exploit reported; affected token deposits and withdrawals paused`
- Category: `risk`
- Tags: `bridge exploit`, `hack`, `suspend deposits`
- `hardBlock: true`
- `hardBlockReason`: derived from the hard-block keyword match

### NewsRiskContext Output

The store/selectors expose:

- `getRiskContext(symbol?)`
- `getFilteredItems(filter?, symbol?)`
- `getCategoryRisk(category)`
- `getNeutralNewsRiskContext()`

The output is consumed by Risk Firewall and Audit Reports without requiring a live news source.

### Risk Firewall Linkage

Risk Firewall now includes external risk rows:

- News Risk
- On-chain Risk
- Macro Risk
- HTX Ecosystem Risk

Rows read the news module outputs and surface PASS/WARNING/FAIL states. A hard block news item can turn the News Risk row into `FAIL` while execution remains paper-only.

### Audit Report Linkage

Audit report mocks now reserve:

- `referencedNews`
- `referencedOnChainAlerts`

Audit Reports UI displays referenced news/on-chain warning cards with source status and risk badges.

### UI Integration

- Workflow first step changed from `Market Event` to `Market Intelligence` and from `市场事件` to `市场情报`.
- Command Center shows a compact News Risk Brief.
- Market Monitor shows the full News & On-chain Intelligence panel.
- Filters support All / Crypto / On-chain / Macro / Funding / HTX / Risk Events.
- News items show title, summary, source, time, category, related symbols, sentiment, severity/risk, sourceStatus, hardBlock, and original link.

### i18n Check

- Added new UI text to `src/i18n/messages/en.json`.
- Added new UI text to `src/i18n/messages/zh-CN.json`.
- JSON parse check passed for both files.
- Search check found no `????`, `undefined`, `missing key`, or replacement characters in message files.
- Browser check in Chinese confirmed: `市场情报`, `新闻与链上情报`, `需要后端`, `计划接入`, and `硬阻断事件已触发` render without乱码.

### Build / Lint Result

- `npm run lint`: pass.
- `npm run build`: pass.
- Build emitted only the existing Vite chunk-size warning for the large app bundle.

### Browser Verification

Using local Vite at `http://127.0.0.1:5173/` with system Edge:

- `/market`: 9 visible news cards for ETH context.
- `/market`: `Mock`, `Planned`, `Backend Required`, and `Hard Block` visible.
- `/risk-firewall`: News Risk / On-chain Risk / Macro Risk / HTX Ecosystem Risk rows visible.
- `/audit-reports`: referencedNews / referencedOnChainAlerts linkage visible.
- Chinese `/market`: no `????`, missing key, `undefined`, or `null` text detected.

### Known Issues

- News sources are currently mock/planned/backend-required only; no live news source is connected in this frontend-only phase.
- Source adapter fetch/rate-limit/cache behavior is only represented by metadata and selector boundaries; a future backend News Gateway should implement actual source fetching.
- The app still emits a Vite chunk-size warning during build; this predates the news module and does not block the build.

## Confidence & Live Decision Engine Update

### Decision Engine Implementation

Added a rule-based Confidence and Live Decision Engine without adding a standalone page and without using the prohibited "AI Confidence" label. The engine lives in `src/services/decision/*`, writes shared state through `src/stores/liveDecisionStore.ts`, and is synchronized from market data plus news/on-chain context through `src/hooks/useLiveDecisionSync.ts`.

### Files Changed

- `docs/confidence-decision-engine-spec.md`
- `src/services/decision/decisionTypes.ts`
- `src/services/decision/scoreNormalize.ts`
- `src/services/decision/confidenceFormula.ts`
- `src/services/decision/riskFormula.ts`
- `src/services/decision/feasibilityFormula.ts`
- `src/services/decision/actionResolver.ts`
- `src/services/decision/hardBlockRules.ts`
- `src/services/decision/marketFeatureExtractor.ts`
- `src/services/decision/decisionEngine.ts`
- `src/stores/liveDecisionStore.ts`
- `src/hooks/useLiveDecisionSync.ts`
- `src/components/decision/LiveDecisionCard.tsx`
- `src/components/decision/LiveDecisionPanel.tsx`
- `src/components/decision/ScoreBreakdown.tsx`
- `src/components/decision/ActionVerdict.tsx`
- `src/components/decision/BlockingReasonsList.tsx`
- `src/components/decision/DecisionEvidenceList.tsx`
- `src/pages/PageWorkspace.tsx`
- `src/components/market/MarketMonitorContent.tsx`
- `src/components/risk/RiskFirewallContent.tsx`
- `src/components/audit/AuditReportsContent.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/zh-CN.json`
- `src/styles/global.css`

### Confidence Formula

`MarketConfidence` uses weighted geometric mean:

```text
100 * T^0.25 * M^0.20 * V^0.15 * L^0.15 * Q^0.10 * RR^0.15
```

Inputs are normalized into `0.05 - 1.00`. `FinalConfidence` applies `EventRiskMultiplier`, `DataReliabilityMultiplier`, and `ConflictMultiplier`.

### Feasibility Formula

`FeasibilityScore` uses a weighted geometric mean of spread quality, liquidity quality, data quality, R/R quality, confidence quality, and inverse risk quality. It is not a simple average.

### Risk Formula

`RiskScore` combines spread risk, ATR risk, liquidity risk, data risk, conflict risk, and event risk. Any `HardBlock` forces `RiskScore = 100`.

### Long / Short Bidirectional Calculation

The engine calculates both `LongConfidence` and `ShortConfidence`. If their absolute difference is below 8, the resolver treats direction as unclear and outputs `WAIT` or `NO_TRADE`.

### HardBlock Rules

HardBlock checks include R/R below 1.2, spread above threshold, ATR above threshold, news hard block, on-chain hard block, low liquidity, and low data quality. HardBlock cannot be overridden by high Confidence and forces `BLOCK`.

### News / On-chain Risk Integration

The engine consumes `NewsRiskContext` from the existing news intelligence selectors. Missing news data defaults to neutral values. News, on-chain, and macro risk affect `FinalConfidence` through `EventRiskMultiplier`.

### Command Center Display

Command Center now shows `Live Decision Card` in the existing opportunity slot. It displays symbol, market regime, current setup, Confidence, Feasibility, Risk, action, next confirmation, evidence, warnings, and blocking reasons.

### Market Monitor Display

Market Monitor now includes `Live Decision Panel` inside the existing resizable workspace. It displays `LongConfidence`, `ShortConfidence`, `MarketConfidence`, `FinalConfidence`, `FeasibilityScore`, `RiskScore`, `NewsRisk`, `OnChainRisk`, `MacroRisk`, `DataReliabilityMultiplier`, `ConflictMultiplier`, `EventRiskMultiplier`, score breakdown, warnings, evidence, and hard-block reasons.

### Risk Firewall Linkage

Risk Firewall reads the shared Decision Engine result and adds rule rows for Confidence threshold, Feasibility threshold, Risk threshold, News risk, On-chain risk, Macro risk, HTX ecosystem risk, and HardBlock.

### Audit Report Linkage

Audit Reports now include a Decision Engine Record with Confidence, Feasibility, Risk, Action, LongConfidence, ShortConfidence, score breakdown, NewsRisk, OnChainRisk, MacroRisk, and HardBlockReason. Copied summaries include the same fields plus referenced news/on-chain alerts.

### i18n Check

New UI text was added to both `src/i18n/messages/en.json` and `src/i18n/messages/zh-CN.json`. The Chinese UI uses `置信度 Confidence`, `可行度 Feasibility`, and `风险度 Risk`, and does not introduce the prohibited `AI置信度` UI label.

### Build / Lint Result

- `npm run lint`: pass.
- `npm run build`: pass.
- Build emitted only the Vite chunk-size warning for the large app bundle.

### Browser Verification

Using local Vite preview at `http://127.0.0.1:5174/` with system Edge:

- `/command-center`: `Live Decision Card` and `Confidence` visible.
- `/market`: `Live Decision Panel` and `LongConfidence` visible.
- `/risk-firewall`: `Confidence threshold` and `HardBlock` visible.
- `/audit-reports`: `Decision Engine Record` and `Score Breakdown` visible.
- Chinese `/command-center`: `实时决策卡` and `置信度 Confidence` visible.
- No checked route showed `AI置信度`, `missing key`, `undefined`, `null`, or `????`.

### Known Issues

- The Decision Engine currently uses frontend market snapshots, normalized technical proxies, and mock/planned/backend-required news adapters; deeper production-grade calculations should move heavy indicator/backtest aggregation into a worker or backend.
- The app still emits a Vite chunk-size warning during build; it does not block the build.

## HTX Real-Time Market Stream to K-Line Chart Fix

Date: 2026-06-20

### Scope

Fixed only the HTX real-time market data -> store -> K-line chart chain. No news module, confidence module, account API, real trading API, API key, secret, withdrawal, or live order logic was added.

### Modified Files

- `backend/app/websocket/market_stream.py`
- `src/api/market.ts`
- `src/hooks/useMarketSocket.ts`
- `src/stores/marketDataStore.ts`
- `src/services/htx/htxTypes.ts`
- `src/components/market/MarketMonitorContent.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/zh-CN.json`
- `FINAL_ACCEPTANCE_REPORT.md`

### Backend Subscriptions

The HTX WebSocket gateway now subscribes to active symbol/timeframe topics:

- ticker/detail: `market.ethusdt.detail`
- ticker fallback/BBO: `market.ethusdt.bbo`
- kline: `market.ethusdt.kline.1min`
- depth: `market.ethusdt.depth.step0`
- trade: `market.ethusdt.trade.detail`

On symbol/timeframe switch, the frontend opens a new `/ws/market?symbol=...&timeframe=...` stream and the backend attempts to unsubscribe old HTX topics during socket cleanup. The browser store filters late messages by active symbol/timeframe and records stale topic drops.

### Stream Diagnostics

Added stream-level diagnostics for:

- `tickerStreamStatus`
- `klineStreamStatus`
- `tradeStreamStatus`
- `depthStreamStatus`
- `chartPatchStatus`

Each stream tracks:

- `lastMessageAt`
- `lastMessageAgeMs`
- `messageCount`
- `lastParseError`
- `subscribedTopic`
- `isStale`

The development debug panel also displays:

- `lastTickerAgeMs`
- `lastKlineAgeMs`
- `lastTradeAgeMs`
- `lastDepthAgeMs`
- `lastCandlePatchAgeMs`
- `storeToChartLatencyMs`
- `chartUpdateIntervalAvgMs`
- `chartUpdateIntervalMaxMs`
- `staleTopicDrops`
- `activeSymbol`
- `activeTimeframe`
- `subscribedTopics`

### Candle Patch Logic

The chart now uses this update order:

1. REST historical klines bootstrap chart history.
2. HTX kline stream syncs official candle data.
3. HTX `trade.detail` patches the current candle when trades arrive.
4. HTX BBO ticker fallback patches the current candle when trade/kline updates are sparse.
5. Depth midpoint patches only when the current candle patch is about to become stale, preventing an order-book-only live state with a frozen chart.

Patch behavior:

- Same timeframe bucket updates the current candle.
- New timeframe bucket appends one candle.
- Duplicate timestamp candles are replaced, not appended repeatedly.
- The chart instance is not recreated for each update.
- KLineCharts receives incremental `subscribeBar` updates.

### Final Browser Sample

Route: `http://127.0.0.1:5174/market`

Active state:

- `activeSymbol`: `ETH/USDT`
- `activeTimeframe`: `1m`
- `Market status`: `degraded` because ticker/depth/chart patch are live while official kline/trade can temporarily be stale.
- `subscribedTopics`: `market.ethusdt.detail`, `market.ethusdt.bbo`, `market.ethusdt.kline.1min`, `market.ethusdt.depth.step0`, `market.ethusdt.trade.detail`

Stream status snapshot:

- Ticker: live, topic `market.ethusdt.bbo`, messageCount `69`, lastMessageAgeMs `970`, lastParseError `null`
- Kline: stale, topic `market.ethusdt.kline.1min`, messageCount `2`, lastMessageAgeMs `4383`, lastParseError `null`
- Trade: stale, topic `market.ethusdt.trade.detail`, messageCount `2`, lastMessageAgeMs `4518`, lastParseError `null`
- Depth: live, topic `market.ethusdt.depth.step0`, messageCount `15`, lastMessageAgeMs `309`, lastParseError `null`
- Chart patch: live, topic `chart.updateData`, messageCount `76`, lastMessageAgeMs `932`, lastParseError `null`

Latency metrics:

- `lastTickerAgeMs`: `970`
- `lastKlineAgeMs`: `4383`
- `lastTradeAgeMs`: `970` via effective ticker fallback patch age while trade stream is stale
- `lastDepthAgeMs`: `309`
- `lastCandlePatchAgeMs`: `969`
- `chartUpdateIntervalAvgMs`: `172`
- `chartUpdateIntervalMaxMs`: `1213`
- `storeToChartLatencyMs`: `37`
- `staleTopicDrops`: `0`
- Last candle patch source: `ticker`

### Switch Verification

Browser store switching confirmed active subscriptions are rebuilt:

- `BTC/USDT 1m`: `market.btcusdt.detail`, `market.btcusdt.bbo`, `market.btcusdt.kline.1min`, `market.btcusdt.depth.step0`, `market.btcusdt.trade.detail`
- `HTX/USDT 1m`: `market.htxusdt.detail`, `market.htxusdt.bbo`, `market.htxusdt.kline.1min`, `market.htxusdt.depth.step0`, `market.htxusdt.trade.detail`
- `HTX/USDT 5m`: `market.htxusdt.detail`, `market.htxusdt.bbo`, `market.htxusdt.kline.5min`, `market.htxusdt.depth.step0`, `market.htxusdt.trade.detail`

`staleTopicDrops` remained `0` in the sampled switches.

### Before / After

Before:

- Backend WS only forwarded detail and depth.
- No kline topic.
- No trade.detail topic.
- Frontend handled only ticker/orderbook messages.
- K-line chart depended on REST/bootstrap plus sparse ticker patches.
- Bottom diagnostics could report depth/order book as fresh while chart/trade were stale.

After:

- Backend forwards ticker/detail, kline, depth, trade.detail, plus BBO ticker fallback.
- Frontend handles ticker, kline, trades, orderbook, subscription status, and stale-topic messages.
- Current candle patches from trade, kline, ticker/BBO fallback, and depth fallback guard.
- Debug panel shows each stream separately.
- Market status degrades when only part of the stream set is live.

### Build / Lint Result

- `python -m compileall backend\app`: pass.
- `npm run build`: pass; Vite emitted only the existing large chunk warning.
- `npx eslint src`: pass.
- `npm run lint`: still fails because the configured root lint target scans `backend/.venv/Lib/site-packages/coverage/htmlfiles/coverage_html.js`, a third-party generated file outside the frontend source.
