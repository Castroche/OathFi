# OathFi

> AI-assisted Crypto Trading Research, Risk Control, Paper Execution & Audit Workflow Terminal

OathFi is an AI-powered cryptocurrency trading research platform designed for traders and researchers.

It combines:

- 📈 Real-time market monitoring
- 🤖 AI-generated trading hypotheses
- 📊 Strategy backtesting
- 🛡 Risk Firewall
- 📝 Paper Trading Execution
- 🔍 Audit Report & Evidence Chain
- 🌐 English / 简体中文 Interface

The platform focuses on creating a transparent and verifiable trading research workflow instead of automated live trading.

---

# Architecture

Frontend

- React
- TypeScript
- Vite

Backend

- FastAPI
- SQLAlchemy
- Alembic

Data

- HTX Market API
- WebSocket Streaming

AI

- DeepSeek
- OpenAI
- Anthropic
- Gemini
- Ollama (Local)

---

# Features

## Command Center

Unified dashboard for market status, AI insights and portfolio overview.

## Market Monitor

Professional trading terminal with:

- Real-time K-Line
- Order Book
- Trade Stream
- Indicators
- Market Events

## Agent Lab

Generate structured trading hypotheses using AI.

## Backtest Studio

Replay and validate trading strategies.

## Risk Firewall

Evaluate every strategy before execution.

## Paper Execution

Execute simulated trades with complete execution records.

## Audit Reports

Every decision is traceable through an evidence chain.

---

# Tech Stack

Frontend

- React
- TypeScript
- Vite

Backend

- FastAPI
- SQLAlchemy
- Alembic

Database

- SQLite

Testing

- Pytest
- Playwright

---

# Quick Start

Frontend

```bash
npm install
npm run dev
```

Backend

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

---

# Security

This repository does **not** contain:

- API Keys
- Exchange Secrets
- Database Dumps

Use:

```
.env.example
backend/.env.example
```

to configure your local environment.

---

# Project Status

Current stage:

✅ Research Platform

✅ Paper Trading

🚧 Live Trading (planned)

---

# License

MIT License
