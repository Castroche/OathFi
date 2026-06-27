# OathFi Demo Runbook

## 1. Project Startup

OathFi is a local demo stack with:

- Frontend: React + Vite
- Backend: FastAPI + SQLite
- Database: `backend/oathfi_demo.db`
- Trading mode: paper trading only
- Real trading: disabled

Recommended local demo ports:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8001`

The backend also supports the acceptance command:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

When using the frontend dev server without changing `vite.config.ts`, run the backend on `8001` because `/api` and `/ws` are proxied to `http://localhost:8001`.

## 2. Frontend Start Command

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Build check:

```bash
npm run build
```

## 3. Backend Start Command

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

Health and docs:

```bash
curl http://127.0.0.1:8001/api/health
open http://127.0.0.1:8001/docs
```

## 4. Environment Variables

Backend variables live in `backend/.env`. Do not commit real `.env` files.

Required demo-safe defaults:

```env
DATABASE_URL=sqlite:///./oathfi_demo.db
BACKEND_PORT=8001
DEFAULT_AI_PROVIDER=deepseek
AI_MOCK_MODE=true
PAPER_TRADING_ENABLED=true
REAL_TRADING_ENABLED=false
```

AI provider keys are backend-only:

```env
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

For hackathon demos, keep `AI_MOCK_MODE=true` unless you intentionally want to demonstrate the backend AI Gateway calling a real provider. Never put AI keys in frontend code or `VITE_*` variables.

## 5. Demo Path

Use ETH/USDT for the main demo:

1. Open `/command-center`.
2. Click `Start Demo Flow` or open `/market`.
3. Confirm ETH/USDT ticker, market events, source, status, and orderbook.
4. Click `Generate Hypothesis`.
5. Review `/agent-lab/:hypothesisId`.
6. Click `Send to Backtest`.
7. Review `/backtest/:backtestId`.
8. Click `Send to Risk Firewall`.
9. Review `/risk-firewall/:riskCheckId`.
10. If risk is `PASS` or `WARNING`, click `Send to Paper Execution`.
11. If risk is `BLOCK`, show the block reason and skip paper execution.
12. Click `Generate Review Report` or `Open Audit Log`.
13. Reopen `/audit-reports/:auditReportId`.
14. Confirm the backend workflow chain shows market event, AI analysis, hypothesis, backtest, risk check, paper order when applicable, and action logs.

## 6. Implemented Features

- Market ticker, orderbook, and kline snapshots through `MarketDataService`.
- Market event retrieval and workflow linking.
- Backend AI Gateway with local mock provider and real provider adapters.
- Hypothesis generation persisted to `hypotheses` and `ai_analyses`.
- Simplified demo backtest persisted to `backtest_jobs` and `backtest_results`.
- Risk check with `PASS`, `WARNING`, and `BLOCK` outcomes.
- Paper order creation only when risk is not `BLOCK`.
- Audit report generation and reload by report id.
- Action logs for the workflow.
- Settings save and data source probe.

## 7. Mock Data

Current mock/demo data is explicitly labeled:

- `local_mock` market event seed in `market_events`.
- `local_mock` news feed items from `/api/news/latest`.
- `local_mock` AI output when `AI_MOCK_MODE=true`.
- Local market fallback when public market providers are unavailable.
- Simplified demo backtest methodology is marked with methodology, data source, sample period, sample quality, and `is_mock` when applicable.

The UI displays `Mock`, `Mock Data`, or source/status labels for mock data. Live/rest snapshots show their backend source, such as `htx-rest-snapshot`.

## 8. Not Implemented

These are intentionally out of scope for the demo:

- Real exchange order placement.
- Wallet transfers or wallet balance management.
- Exchange account API integration.
- Withdrawal, deposit, or custody flows.
- Production authentication and authorization.
- Production-grade backtest engine and execution simulator.
- Production security headers at CDN/edge level.

## 9. Risk Notes

- `REAL_TRADING_ENABLED` must remain `false`.
- `PAPER_TRADING_ENABLED` must remain `true`.
- Paper orders must always store `is_real_trade=false`.
- `.env.example` must not contain real secrets.
- Frontend code must not include AI provider keys, exchange secrets, wallet keys, or private credentials.
- If `AI_MOCK_MODE=false`, real AI calls are made only by the backend AI Gateway.
- Browser WebSocket interruptions must fall back to REST snapshots and show `disconnected`, `stale`, `rest_snapshot`, or `mock` status instead of crashing.

## 10. Hackathon Script

1. "OathFi starts from public market intelligence, not manual trade entry."
2. Open ETH/USDT and show ticker, orderbook, source, status, and mock/live labels.
3. Click `Generate Hypothesis`.
4. Explain that the hypothesis is persisted with a `workflow_id` and linked market event.
5. Click `Send to Backtest`.
6. Show win rate, profit factor, drawdown, trade count, sample quality, and methodology.
7. Click `Send to Risk Firewall`.
8. Show the risk decision and explain `BLOCK` prevents execution.
9. If non-BLOCK, click `Send to Paper Execution` and show `is_real_trade=false`.
10. Click `Generate Review Report`.
11. Reopen the report URL and show the backend workflow chain and action logs.
12. Close by stating: "This is a paper-only, auditable workflow. Real trading, wallets, and secrets are not exposed to the browser."
