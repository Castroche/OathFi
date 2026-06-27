# LIVE_MARKET_CHARTING_REPORT

## Commands Executed

- Read constraint files: docs/oathfi-required-constraint-files.md, docs/live-market-charting-spec.md, docs/NO_MOCK_POLICY.md, docs/oathfi-frontend-constraints/CHART_PANE_POLICY.md, docs/oathfi-frontend-constraints/FRONTEND_ACCEPTANCE_CHECKLIST.md.
- npm run build: passed.
- npm run lint: failed because the configured script scans backend/.venv third-party coverage files.
- npx eslint src: passed.
- backend/.venv/Scripts/python.exe -m py_compile backend/app/websocket/market_stream.py: passed.
- FastAPI TestClient WebSocket fallback smoke test: passed; forced HTX WS failure returned source_status, ticker, kline, and orderbook messages.

## Files Changed

- backend/app/websocket/market_stream.py
- src/api/market.ts
- src/hooks/useMarketSocket.ts
- src/stores/marketDataStore.ts
- LIVE_MARKET_CHARTING_REPORT.md

## Dependencies Added

- None.

## Data Sources Connected

- Primary path: backend /ws/market bridges HTX public WebSocket when available.
- Fallback path: backend keeps /ws/market open and streams HTX public REST snapshots with status=rest_snapshot when HTX WebSocket is unavailable.
- Frontend low-frequency REST refresh runs only while no live stream is healthy.

## Symbols Supported

- BTC/USDT
- ETH/USDT
- HTX/USDT
- Existing symbol selector defaults remain unchanged.

## Charting Fixes

- Backend WebSocket no longer closes immediately on upstream HTX WS failure.
- REST snapshot fallback sends ticker, latest kline patch, and order book through the same frontend message pipeline.
- Frontend WebSocket now reconnects with bounded backoff.
- WebSocket errors no longer wipe usable REST snapshot data from the chart.
- Frontend REST refresh patches ticker and order book without full chart resets while WS is unavailable.
- Snapshot data is marked rest_snapshot/fallback instead of being displayed as live.
- Mock status now maps to mock, not error.

## Known Limitations

- If the runtime network blocks HTX WebSocket, the UI will show rest_snapshot rather than live. This is intentional and follows the no-mock/no-fake-live policy.
- The existing npm run lint script needs an ignore rule for backend/.venv; scoped frontend lint passes.

## Safety Boundaries

- No real trading added.
- No account API added.
- No API key or secret handling added.
- No withdrawal or live order endpoint added.
- Mock data is not hidden as live data.

## Manual Testing Checklist

- Open /market and confirm the chart renders historical candles after REST snapshot load.
- Confirm status shows live only when HTX WebSocket messages are live.
- Block or force HTX WebSocket failure and confirm status remains rest_snapshot/fallback with chart, ticker, and order book updating.
- Switch ETH/USDT, BTC/USDT, and HTX/USDT and confirm old symbol data is cleared before the new snapshot appears.
- Switch timeframe and confirm the chart resets only for the selected timeframe.
