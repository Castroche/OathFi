# CODEX_MASTER_CONSTRAINTS.md

OathFi must be upgraded from a visual prototype into a real AI × HTX trading research and risk agent.

## Hard Constraints

1. Do not use mock, fake, static, placeholder, or hardcoded data for market prices, order book, trades, backtests, risk checks, paper orders, audit reports, or AI outputs.

2. Demo Mode means paper trading only. It does **not** mean fake market data.

3. Every visible card must be backed by a frontend state source and, where applicable, a backend API/database record.

4. Every button must either call a real API, change a persisted state, navigate to a real workflow route, or show a clear disabled reason.

5. HTX market data must come from real HTX REST/WebSocket providers with reconnect and fallback.

6. AI output must be structured JSON and persisted.

7. Backtest results must be calculated from historical market data.

8. Risk decisions must be calculated by backend rules.

9. Paper execution must write orders, fills, positions, and logs into the database.

10. Audit reports must reconstruct the workflow from persisted entities and generate a hash.

11. Settings must persist to backend and affect actual behavior.

12. API responses must use the unified `{ ok, data }` / `{ ok, error }` envelope.

13. All schema changes require Alembic migrations.

14. Do not commit `.env`, API keys, `node_modules`, `venv`, `.venv`, `dist`, `output`, local databases, or logs.

15. Preserve i18n and avoid hardcoded visible text unless added to locale files.

---

## Architecture Constraints

### Frontend

Use the existing frontend stack:

- React
- TypeScript
- Vite
- React Router
- TanStack React Query
- Zustand
- i18next
- klinecharts
- lucide-react
- Existing CSS token system

Do not replace the frontend framework unless explicitly instructed.

Frontend must use:

- React Query for HTTP API state
- Zustand for workflow/session state
- WebSocket hooks for live market data
- i18n locale files for all visible user-facing text
- Shared common components for repeated cards, KPI tiles, buttons, tables, loading states, error states, and empty states

Frontend must not:

- Store real API keys in localStorage
- Hardcode prices, trades, order books, AI output, backtest results, risk decisions, paper orders, or audit reports
- Hide failed API calls by showing fake successful data
- Create UI-only buttons with no action, route, or disabled reason

### Backend

Use the existing backend stack:

- FastAPI
- Uvicorn
- SQLAlchemy
- Alembic
- Pydantic
- pydantic-settings

Backend should add dependencies only when necessary, such as:

- `httpx` for REST providers
- `websockets` for HTX WebSocket
- `pandas` / `numpy` for backtesting and indicators
- `cryptography` for secure API key handling if user-provided keys are persisted

Backend must follow this layering:

```txt
api → schemas → services → providers/repositories → database/external APIs
```

Do not put core business logic directly inside route handlers.

### Database

Use:

- PostgreSQL for product/demo deployment
- SQLite only as local development fallback
- Alembic for all schema migrations

Every persistent workflow entity must be stored in the database:

- market events
- AI analyses
- hypotheses
- strategy rules
- backtest jobs
- backtest results
- risk checks
- paper accounts
- paper orders
- paper fills
- paper positions
- audit reports
- audit events
- user settings
- action logs

---

## API Contract Constraints

All APIs must use a unified response format.

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

Do not return mixed FastAPI default shapes such as:

```json
{
  "detail": "some error"
}
```

unless the frontend client explicitly normalizes them.

The frontend API client must correctly parse:

- successful responses
- backend business errors
- network errors
- validation errors
- provider failures
- risk-blocked decisions

---

## Workflow Constraints

The full product workflow must use persistent IDs:

```txt
market_event_id
↓
hypothesis_id
↓
strategy_rule_id
↓
backtest_id
↓
risk_check_id
↓
paper_order_id
↓
audit_report_id
```

The frontend workflow store must track:

- `workflowId`
- `marketEventId`
- `hypothesisId`
- `strategyRuleId`
- `backtestId`
- `riskCheckId`
- `paperOrderId`
- `auditReportId`

The backend must log every major workflow transition into `action_logs` or an equivalent audit/event table.

Workflow steps must be recoverable after page refresh.

---

## Page-by-Page Functional Requirements

### 1. Command Center

Must show real data for:

- HTX API status
- BTC/USDT ticker
- ETH/USDT ticker
- HTX/USDT ticker
- agent status
- risk mode
- demo/paper mode
- market pulse
- active market events
- main opportunity card
- recent decisions
- latest audit trail

Buttons must work:

- Generate Hypothesis
- View Supporting Data
- Analyze
- View Audit
- View All Events

### 2. Market Monitor

Must show real HTX data for:

- ticker
- 24h high/low/volume
- funding rate if available
- klines
- order book
- recent trades
- spread
- depth imbalance
- liquidity score
- market event timeline

Must support:

- interval switching
- symbol switching
- live WebSocket updates
- REST fallback
- reconnect status
- latency display
- indicator overlay

### 3. Agent Lab

Must generate and persist structured AI hypotheses based on:

- market event
- ticker
- klines
- order book
- indicators
- news/events
- risk context

AI output must be structured JSON and saved to the database.

Required actions:

- New Analysis
- Run Backtest
- Edit Rule
- Reject
- Send to Backtest
- Save as Draft

### 4. Backtest Studio

Must run real backtests using historical market data.

Backtest output must include:

- win rate
- profit factor
- expected value
- max drawdown
- total trades
- average R/R
- sample quality
- Sharpe ratio if implemented
- equity curve
- drawdown curve
- trade distribution
- full trade list

Backtest results must be persisted.

### 5. Risk Firewall

Must calculate real risk decisions using:

- hypothesis
- backtest result
- current ticker
- order book liquidity
- spread
- volatility
- account equity
- risk settings
- stop loss distance
- reward/risk
- daily loss rules
- live trading disabled rule

Risk decision must be persisted and must control whether Paper Execution is enabled.

### 6. Paper Execution

Paper trading must be real backend simulation, not frontend fake data.

Must persist:

- paper account
- order
- fill
- position
- execution log

Live trading must remain disabled unless explicitly implemented as a separate audited module.

### 7. Audit Reports

Audit reports must reconstruct the full workflow:

- market event
- AI hypothesis
- strategy rule
- backtest result
- risk check
- paper order
- execution log
- final review

Audit reports must support:

- summary
- evidence view
- full audit log
- JSON export
- Markdown export
- local hash generation

Do not claim on-chain immutability unless real on-chain anchoring is implemented.

### 8. HTX Ecosystem

Must clearly separate:

- Connected
- Read-only
- Disabled
- Planned
- Roadmap

HTX API statuses must come from real health checks.

Do not show B.AI, $HTX utility tiers, account read-only, live trading, or ecosystem features as connected unless they are implemented.

### 9. Settings

Settings must persist to backend and affect actual system behavior.

Required settings:

- primary data source
- connection type
- fallback method
- latency monitor
- auto reconnect
- model provider
- model name
- output mode
- confidence calibration
- max risk per trade
- max daily loss
- max consecutive losses
- position size mode
- stop loss enforcement
- paper trading enabled
- live trading enabled
- demo mode
- language

Settings must support:

- Save Settings
- Reset to Defaults
- Test Market Source
- Test AI Provider

---

## No Mock Policy

Mock data is prohibited for product features.

The following must never be mocked in user-visible product mode:

- market prices
- order book
- trades
- klines
- news links
- AI analysis
- hypothesis
- backtest result
- risk decision
- paper order
- audit report
- source status

Allowed only when clearly marked as test fixtures:

- unit test fixtures
- Storybook examples if added
- backend tests
- local development fixtures explicitly separated from product mode

`Demo Mode` means:

```txt
paper trading only, no real funds
```

It does not mean:

```txt
fake market data or fake AI output
```

---

## Security Constraints

Do not commit:

- `.env`
- API keys
- private keys
- exchange credentials
- local databases
- logs containing secrets

If user API keys are persisted:

- encrypt them server-side
- never return full keys to frontend
- display only masked form
- allow deletion/reset

Live trading must be disabled by default.

Paper trading must be the default execution mode.

---

## Testing and Acceptance Constraints

Every major module must have at least one verification path.

Required checks:

```bash
npm run build
npm run lint
```

Backend checks:

```bash
python -m compileall app
pytest
```

If tests are not available yet, add at least smoke tests for:

- health API
- market status API
- settings API
- hypothesis generation with stubbed provider
- backtest engine with fixture data
- risk engine
- paper execution
- audit report generation

End-to-end workflow must be testable:

```txt
Command Center
→ Market Monitor
→ Agent Lab
→ Backtest Studio
→ Risk Firewall
→ Paper Execution
→ Audit Reports
```

---

## Open Source / Submission Constraints

Before submission or open-source release:

- remove `.env`
- remove local database files
- remove `node_modules`
- remove `.venv`
- remove `dist`
- remove `output`
- remove logs
- provide `.env.example`
- provide README
- provide architecture documentation
- provide API contract documentation
- provide demo script
- provide setup instructions

README must explain:

- what OathFi is
- how it fits HTX Genesis
- which HTX resources are used
- how the AI Agent works
- how the backend works
- how to start frontend
- how to start backend
- how to configure environment variables
- how to run the full demo flow
- which features are implemented
- which features are planned
