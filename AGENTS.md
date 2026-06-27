# OathFi Project Operating Rules

This file is the standing project charter for all Codex work inside the OathFi repository. Follow it for every future task in this folder, even when the conversation changes.

## Locked Technology Stack

Do not replace the existing project stack or scaffold a new app unless the user explicitly asks for a platform migration.

### Frontend

Use the existing frontend stack:

- React 19
- TypeScript
- Vite
- React Router
- TanStack React Query
- Zustand
- i18next
- klinecharts
- lucide-react
- CSS tokens and `global.css`

Approved additions:

- `recharts` for Equity Curve, Drawdown Curve, Trade Distribution, and similar charts.
- `date-fns` for frontend date and time formatting.

Do not migrate this project to Next.js, Tailwind, or a fresh frontend scaffold.

### Backend

Use the existing backend stack:

- FastAPI
- Uvicorn
- SQLAlchemy
- Alembic
- Pydantic
- pydantic-settings

Approved additions:

- `httpx` for HTX REST and news-source requests.
- `websockets` for HTX WebSocket connections.
- `pandas` and `numpy` for backtesting and indicator calculations.
- `python-dateutil` for backend time handling.
- `cryptography` for encrypted API key storage when user keys are persisted.

### Database

- Development and demo may keep SQLite when appropriate.
- Production target is PostgreSQL.
- Hackathon demo should prefer PostgreSQL when feasible because it presents as a more realistic product.
- All database schema changes must go through Alembic migrations.

## Frontend/Backend Connection Model

Use exactly these three integration paths.

### 1. HTTP API

Use ordinary HTTP API calls for:

- settings
- market events
- hypothesis
- backtest
- risk check
- paper execution
- audit reports
- news
- dashboard summary

Frontend entry point:

- `src/api/client.ts`

Backend responses must use the unified envelope:

```json
{
  "ok": true,
  "data": {}
}
```

Backend errors must use the unified envelope:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### 2. WebSocket

Use WebSocket connections for:

- realtime ticker
- realtime kline
- realtime orderbook
- realtime trades
- connection status
- latency

Frontend files:

- `src/hooks/useMarketSocket.ts`
- `src/stores/marketDataStore.ts`

Backend file:

- `backend/app/websocket/market_stream.py`

### 3. Database Workflow IDs

The core product flow must be linked by database IDs:

```text
market_event_id
-> hypothesis_id
-> backtest_id
-> risk_check_id
-> paper_order_id
-> audit_report_id
```

Frontend Zustand state must store the current workflow in:

- `src/stores/appStore.ts`

Backend database records must store the authoritative workflow IDs.

## Hard Constraints

1. Do not hardcode market data, backtest results, risk results, orders, or audit data.
2. Do not use mock data to impersonate real functionality.
3. Demo Mode only means no real capital is used; it does not mean fake data is allowed.
4. Every button must trigger a backend action, trigger a route action, or have a clear disabled reason.
5. Every API must use the unified response envelope.
6. Every new table must have an Alembic migration.
7. Every page must support loading, error, empty, and success states.
8. Real secrets must come only from `.env` or encrypted backend storage. Never put real keys in the frontend.
9. HTX ecosystem features that are planned must be clearly labeled `Planned`; never present them as `Connected`.
10. Chinese and English copy must go through i18n. Do not hardcode mixed-language UI strings.

## Required Capability Modules

When planning or explaining project work, name the relevant capability modules from this list:

- `frontend-ui-replication`
- `frontend-state-management`
- `frontend-api-integration`
- `backend-fastapi-api-design`
- `database-schema-migration`
- `realtime-websocket-market-data`
- `htx-market-provider`
- `ai-agent-structured-output`
- `quant-backtest-engine`
- `risk-engine`
- `paper-trading-ledger`
- `audit-log-system`
- `i18n-localization`
- `security-api-key-management`
- `e2e-testing`
- `demo-packaging`
