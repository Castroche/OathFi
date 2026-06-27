# OathFi Docs Pack

This package contains the frontend constraint documents for OathFi.

## Files

```text
docs/00-codex-instructions.md
docs/01-product-brief.md
docs/02-style.md
docs/03-tech-stack.md
docs/04-i18n-rules.md
docs/05-frontend-constraints.md
docs/06-acceptance-checklist.md
```

## How to use

1. Copy the `docs/` folder into the root of your project.
2. Give Codex this instruction:

```text
Please read docs/00-codex-instructions.md first, then read all docs in order.
Do not modify code until you finish the project audit and implementation plan.
The final frontend must match the dark professional OathFi UI style defined in docs/02-style.md.
```

## Target

The frontend must visually match the generated OathFi dark terminal UI references:
Command Center, Market Monitor, Agent Lab, Backtest Studio, and Risk Firewall.

## Local demo ports

Use port `8001` for the OathFi backend during local validation so it does not collide with services already using `8000`.

```powershell
cd backend
uvicorn app.main:app --reload --port 8001
```

The Vite dev proxy sends `/api` to `http://localhost:8001` and `/ws` to `ws://localhost:8001`.
