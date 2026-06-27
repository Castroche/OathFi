# OathFi Live Market & Pro Charting Spec

## 1. Goal

Upgrade OathFi from a mock market demo into a live HTX public market data terminal.

The goal is not to enable real trading. The goal is to make market data real, selectable, and analysis-ready.

OathFi must remain:

- Demo Mode ON
- Paper Trading Only
- Live Trading Disabled
- No account API
- No private API
- No API Secret
- No real order placement

## 2. Scope

### In scope

- HTX public market data
- Live ticker
- Live candlestick chart
- Live order book
- Live trades stream
- HTX symbol search
- Timeframe switching
- Exchange-grade chart interactions
- Mock fallback
- Data source status
- Latency and last update display

### Out of scope

- Real trading
- Account balance
- User positions from exchange
- Order placement
- Withdrawals
- Private API authentication
- API key storage
- Backend database
- Payment system

## 3. HTX Public Data Requirements

Use HTX public market data only.

Required REST bootstrap:

- Get all supported trading symbols
- Get latest ticker
- Get historical klines
- Get market depth
- Get recent trades if needed

Required WebSocket subscriptions for the selected active symbol:

- `market.{symbol}.ticker`
- `market.{symbol}.kline.{period}`
- `market.{symbol}.depth.step0`
- `market.{symbol}.trade.detail`

The application must handle:

- GZIP compressed WebSocket messages
- ping / pong heartbeat
- reconnect with backoff
- duplicate message prevention
- stale data detection
- symbol change unsubscribe / resubscribe
- mock fallback when live data fails

## 4. Symbol Selection

The user must be able to select any HTX-supported symbol.

Symbol selector requirements:

- Fetch symbols from HTX public symbol list
- Normalize symbols into display format, such as `ETH/USDT`
- Support search by base, quote, and full pair
- Support filters:
  - USDT pairs
  - BTC pairs
  - HTX ecosystem pairs
  - Favorites
  - Recently viewed
- Default symbols:
  - BTC/USDT
  - ETH/USDT
  - HTX/USDT

When the user selects a symbol:

1. Unsubscribe old WebSocket topics.
2. Clear stale chart state.
3. Fetch REST snapshot for the new symbol.
4. Subscribe to live ticker, kline, depth, and trades.
5. Update URL query state if reasonable.
6. Update all market panels.

## 5. Charting Requirements

The K-line chart must behave like an exchange chart, not a static frontend chart.

Required chart features:

- Candlestick chart
- Volume pane
- Timeframe switch:
  - 1m
  - 5m
  - 15m
  - 1h
  - 4h
  - 1d
- Crosshair
- OHLC tooltip
- Last price line
- Price scale
- Time scale
- Zoom
- Pan
- Scroll to latest
- Auto update current candle
- No full chart rerender on every tick
- Loading state
- Reconnecting state
- Mock fallback state

Required indicators:

- MA
- EMA
- BOLL
- VWAP
- RSI
- MACD
- KDJ
- ATR

Required drawing tools:

- Trend line
- Horizontal line
- Vertical line
- Rectangle
- Fibonacci retracement
- Text marker
- Clear drawings
- Save drawings per symbol and timeframe in localStorage

Optional but preferred:

- Heikin Ashi
- Price change percentage mode
- Log scale
- High / low markers
- Event markers from Agent / Audit

## 6. Market Panels

Market Monitor must include:

- Main K-line terminal
- Order book
- Recent trades
- Indicator panel
- Market event timeline
- Symbol header
- 24h high / low / volume
- Spread
- Best bid / best ask
- Data source status
- Last update timestamp
- Latency in milliseconds

## 7. Data Architecture

Create a clear market data layer.

Suggested files:

```text
src/services/htx/htxRest.ts
src/services/htx/htxWebSocket.ts
src/services/htx/htxTypes.ts
src/services/htx/htxAdapter.ts
src/stores/marketDataStore.ts
src/hooks/useLiveMarketData.ts
src/components/market/SymbolSelector.tsx
src/components/market/ProKlineTerminal.tsx
src/components/market/LiveOrderBook.tsx
src/components/market/LiveTradesStream.tsx
```

The UI must not directly consume raw HTX responses.

All HTX data must be normalized through adapters.

## 8. State Model

Market data state should include:

- `activeSymbol`
- `activeTimeframe`
- `availableSymbols`
- `favorites`
- `recentSymbols`
- `ticker`
- `klines`
- `orderBook`
- `trades`
- `connectionStatus`
- `dataSource`
- `lastUpdated`
- `latencyMs`
- `error`
- `isFallbackMode`

Possible connection statuses:

- `live`
- `connecting`
- `reconnecting`
- `disconnected`
- `fallback`
- `error`

Possible data sources:

- `htx-live`
- `htx-rest-snapshot`
- `mock-fallback`

## 9. Safety Requirements

Never implement real trading in this task.

Do not add:

- API Key input
- Secret Key input
- Account balance API
- Real order endpoint
- Withdrawal endpoint
- Live order placement
- Leverage control
- Real position management

All execution pages must continue to display:

- Paper Trading Only
- Live Trading Disabled
- No real funds used

## 10. Acceptance Criteria

The task is complete only if:

1. The user can select HTX-supported symbols.
2. BTC/USDT, ETH/USDT, and HTX/USDT work.
3. The K-line chart updates without manual refresh.
4. The order book updates with live data.
5. Recent trades update with live data.
6. The current candle updates in place instead of appending duplicate candles.
7. The chart supports timeframe switching.
8. The chart has volume and common indicators.
9. The chart has basic drawing tools.
10. The UI shows data source, last update time, and connection status.
11. Network failure triggers mock fallback instead of page crash.
12. No private API or real trading logic exists.
13. `npm run build` passes.
14. `npm run lint` passes if lint is configured.
15. A final `LIVE_MARKET_CHARTING_REPORT.md` is generated.

## 11. Final Report

After implementation, generate:

```text
LIVE_MARKET_CHARTING_REPORT.md
```

The report must include:

- Commands executed
- Files changed
- Dependencies added
- Data sources connected
- Symbols supported
- Charting features implemented
- Known limitations
- Safety boundaries
- Build result
- Manual testing checklist
## 12. Exchange-Grade Performance Requirements

The charting terminal must not only look like an exchange chart. It must also behave like one.

Exchange-grade means:

* Smooth real-time updates
* No visible UI freezing
* No full-page rerender on every market tick
* No chart flickering
* No duplicated candles
* No growing memory usage during long sessions
* Fast symbol switching
* Fast timeframe switching
* Stable WebSocket reconnection
* Controlled rendering frequency

### 12.1 Rendering Rules

Do not update the entire React component tree for every WebSocket message.

Market data updates must be separated from React layout rendering.

Required rules:

* Use external store or Zustand selectors to avoid unnecessary rerenders.
* Do not store every raw tick directly in React component state.
* Do not pass large changing arrays through many component props.
* Do not recreate chart instances on every render.
* Do not recreate WebSocket connections on every render.
* Do not full-reset chart data unless symbol or timeframe changes.
* Update the active candle in place when possible.
* Append a new candle only when the candle timestamp changes.

### 12.2 Update Frequency Control

High-frequency WebSocket data must be buffered.

Required update policy:

* Ticker UI: update at most 4 to 10 times per second.
* Order book UI: update at most 5 to 10 times per second.
* Recent trades UI: batch updates instead of rendering each trade immediately.
* K-line chart: update current candle incrementally.
* Indicator recalculation: throttle or debounce; do not recalculate all indicators on every tick.
* Heavy calculations must not run on the main render path.

### 12.3 WebSocket Data Pipeline

Use this pipeline:

WebSocket raw message
→ decompress / parse
→ normalize through adapter
→ write into market data buffer
→ batch update store
→ chart incremental update
→ controlled UI repaint

Do not use this anti-pattern:

WebSocket message
→ React setState
→ full component rerender
→ chart recreated
→ layout jank

### 12.4 Chart Instance Management

The chart instance must be long-lived.

Required:

* Create chart instance once on mount.
* Dispose chart instance on unmount.
* Reuse chart instance during live updates.
* Only reset chart when symbol or timeframe changes.
* Use chart API incremental update methods when available.
* Avoid full data replacement during every tick.
* Use requestAnimationFrame for visual update scheduling when useful.

### 12.5 Data Size Limits

Prevent memory growth.

Required limits:

* Keep visible K-line data bounded.
* Default historical candles: 500 to 1000.
* Maximum in-memory candles per symbol/timeframe: configurable.
* Recent trades list: keep latest 100 to 300.
* Order book levels: keep only visible depth levels unless deeper data is needed.
* Event timeline: virtualize if long.
* Audit logs: virtualize or paginate if long.

### 12.6 Web Worker Requirements

Move heavy computations away from the main thread when needed.

Use Web Worker for:

* Indicator calculation if it causes UI jank
* Large historical kline transformation
* Backtest calculations
* Heavy aggregation
* Large symbol list filtering if needed

The main UI thread should prioritize interaction responsiveness.

### 12.7 Symbol Switching Performance

When switching symbols:

1. Stop old subscriptions.
2. Clear only symbol-specific data.
3. Keep layout mounted.
4. Show lightweight loading skeleton.
5. Fetch REST snapshot.
6. Apply initial chart data once.
7. Start WebSocket live updates.
8. Avoid blank page or full app reload.

Target:

* Symbol switch should feel immediate.
* UI shell should stay stable.
* The chart may show loading state, but the full page must not freeze.

### 12.8 Timeframe Switching Performance

When switching timeframe:

1. Do not recreate the whole page.
2. Reset only the chart data and indicator data.
3. Fetch historical klines for the selected timeframe.
4. Subscribe to the new kline topic.
5. Reuse existing market panels if the symbol is unchanged.

Target:

* Timeframe switch should complete quickly.
* No duplicate WebSocket subscriptions.
* No stale candle from previous timeframe.

### 12.9 React Performance Requirements

Use these techniques:

* React.memo for heavy visual components
* useMemo for derived data
* useCallback for stable handlers
* Zustand selectors with shallow comparison
* Component-level isolation
* Avoid prop drilling large market arrays
* Avoid unnecessary context updates
* Virtualized lists for large tables or streams

### 12.10 UI Responsiveness Targets

Acceptance targets:

* No visible freezing during live updates.
* Chart pan and zoom remain responsive while data is streaming.
* Crosshair movement remains smooth.
* Order book updates do not cause layout shift.
* Recent trades do not push the page layout violently.
* CPU usage remains reasonable during normal streaming.
* Memory does not continuously increase after 10 minutes of use.
* Browser DevTools Performance should not show repeated full-page rerenders.

### 12.11 Performance Acceptance Checklist

The implementation is not acceptable unless:

1. The chart updates without visible stutter.
2. Crosshair movement remains smooth during WebSocket updates.
3. Zoom and pan remain responsive.
4. Order book updates do not freeze the page.
5. Recent trades update in batches.
6. The current candle updates in place.
7. Switching symbols does not reload the entire app.
8. Switching timeframes does not leave old subscriptions alive.
9. Running for 10 minutes does not cause obvious memory growth.
10. React DevTools does not show unnecessary full-tree rerenders on every tick.
11. Browser console has no repeated WebSocket or render errors.
12. npm run build passes.

### 12.12 Forbidden Performance Anti-Patterns

Do not:

* Call React setState for every raw trade tick.
* Store unlimited raw WebSocket messages in memory.
* Recreate chart instance on every data update.
* Recalculate all indicators on every tick.
* Replace the entire kline array on every tick.
* Render thousands of trades directly without virtualization.
* Open WebSocket subscriptions for every HTX symbol at once.
* Keep old WebSocket connections alive after symbol switch.
* Use interval polling as the primary live data method when WebSocket is available.
* Trigger layout reflow through constantly changing container sizes.
