# OathFi Frontend Constraints

---

## 1. Absolute Prohibitions

Codex must not do the following:

1. Do not rename OathFi.
2. Do not use old product names.
3. Do not turn the app into a landing page.
4. Do not turn Agent Lab into a normal chatbot.
5. Do not enable live trading by default.
6. Do not hide Demo Mode.
7. Do not remove the workflow stepper.
8. Do not change the sidebar navigation order.
9. Do not add unrelated product pages.
10. Do not hardcode UI copy in JSX/TSX.
11. Do not ignore i18n rules.
12. Do not introduce large UI libraries without approval.
13. Do not expose API secrets in frontend.
14. Do not promise profit.
15. Do not break existing backend contracts without explanation.

---

## 2. Product Name Redline

Only valid:

```text
OathFi
```

Forbidden in UI:

```text
Any previous working title
```

Codex must run a search before final output.

---

## 3. Default Trading Safety

The app must default to:

```text
Demo Mode ON
Paper Trading Only
Live Trading Disabled
No real funds involved
```

These must be visible where relevant:

```text
TopBar
Risk Firewall
Paper Execution
Settings
```

---

## 4. Real Trading Restrictions

Do not implement real trading unless explicitly approved.

If real trading appears in roadmap or settings:

```text
Status: Disabled
Label: Planned
Requires Manual Approval
```

Do not create working live order buttons.

---

## 5. Page Restrictions

Allowed pages:

```text
Command Center
Market Monitor
Agent Lab
Backtest Studio
Risk Firewall
Paper Execution
Audit Reports
HTX Ecosystem
Settings
```

Forbidden unless approved:

```text
NFT
Wallet
DAO Governance
Social Feed
Meme Launch
Exchange
Copy Trading
Referral Center
Launchpad
Portfolio Optimizer
```

---

## 6. Agent Lab Constraint

Agent Lab must be a structured AI research workspace.

Required:

```text
Market Context
Agent Reasoning Panel
AI Hypothesis Generation
Hypothesis Cards
Convert to Strategy Rule
Strategy Preview
```

Forbidden:

```text
A single full-screen chat box
ChatGPT-style assistant-only layout
Unstructured text-only answers
No trigger/invalidation/risk/backtest rule
```

Every hypothesis must include:

```text
Trigger
Invalidation
Risk
Backtest Rule
Suggested Action
```

---

## 7. Backtest Constraint

Backtest Studio must show validation metrics.

Required:

```text
Win Rate
Profit Factor
Expected Value
Max Drawdown
Total Trades
Average R/R
Sample Quality
Sharpe Ratio
Backtest Verdict
Equity Curve
Trade List
```

Do not show only win rate.

---

## 8. Risk Firewall Constraint

Risk Firewall must show serious rule-by-rule evaluation.

Required columns:

```text
Rule
Threshold
Actual
Status
Notes
```

Allowed statuses:

```text
PASS
WARNING
FAIL
```

Risk decisions:

```text
APPROVED
APPROVED WITH LIMIT
PAPER ONLY
APPROVED FOR PAPER TRADING
REJECTED
```

Default demo decision:

```text
APPROVED FOR PAPER TRADING
```

---

## 9. Paper Execution Constraint

Paper Execution must show:

```text
No real funds involved
Paper Trading Only
Live Trading Disabled
```

Required panels:

```text
Order Ticket
Execution Preview
Active Paper Positions
Execution Log
```

---

## 10. Audit Constraint

Audit Reports must show:

```text
Market Event
Agent Hypothesis
Backtest Result
Risk Firewall
Execution
Review
```

It must be possible to explain why a trade hypothesis was accepted, rejected, or paper-executed.

---

## 11. UI Style Constraint

The UI must match the generated reference images:

```text
Dark theme
Dense layout
Professional trading terminal
Orange active states
Green/red market values
Realistic chart panels
Structured cards
No generic SaaS visuals
```

Forbidden:

```text
large hero section
gradient blobs
cartoon mascot
random neon cyberpunk
white dashboard
excessive rounded cards
mobile-first consumer look
```

---

## 12. Internationalization Constraint

All user-facing text must be translated.

Forbidden:

```tsx
<h1>Command Center</h1>
<button>Generate Hypothesis</button>
```

Required:

```tsx
<h1>{t("navigation.commandCenter")}</h1>
<button>{t("actions.generateHypothesis")}</button>
```

---

## 13. Data Constraint

If using mock data:

```text
Mock data must live in a mock folder
Mock data must not be scattered inside components
Mock data must clearly be demo/paper data
```

Allowed:

```text
src/mock/market.ts
src/mock/agent.ts
src/mock/backtest.ts
src/mock/risk.ts
```

---

## 14. Security Constraint

Never expose:

```text
API Secret
Private key
Wallet mnemonic
Exchange secret
Database password
JWT secret
```

Frontend can contain:

```text
Public market symbols
Demo account equity
Mock trading results
Public API status labels
```

---

## 15. Build Constraint

Codex must not leave the project broken.

Before reporting completion:

```text
npm run build
npm run lint
```

If commands fail, Codex must report exact errors and the files involved.

---

## 16. Component Quality Constraint

Components must be:

```text
Reusable
Typed
Small enough to maintain
Consistent with tokens
i18n-ready
```

Avoid:

```text
one giant 2000-line page component
inline random style objects
duplicated table implementations
duplicated status pill styling
```

---

## 17. Final Constraint

If Codex is unsure, it must ask before changing:

```text
Product direction
Framework
Routing system
i18n architecture
Trading execution behavior
API contracts
Design system
```
