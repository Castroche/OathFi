# OathFi Acceptance Checklist

> Use this file after every Codex implementation stage.

---

## 1. Global Build Checklist

```text
[ ] Project installs successfully
[ ] Development server starts
[ ] npm run build passes
[ ] npm run lint passes
[ ] No blocking TypeScript errors
[ ] No browser console errors on main pages
[ ] No broken imports
[ ] No missing translation files
```

---

## 2. Product Identity Checklist

```text
[ ] Product name is OathFi everywhere
[ ] Top-left brand says OathFi
[ ] Browser title uses OathFi
[ ] README / metadata uses OathFi
[ ] No old product name appears in UI
[ ] No old product name appears in routes
[ ] No old product name appears in mock data
[ ] No old product name appears in comments unless explicitly documenting forbidden names
```

Search target:

```text
previous working titles
```

---

## 3. Global UI Checklist

```text
[ ] Dark professional terminal style
[ ] TopBar exists
[ ] Sidebar exists
[ ] WorkflowStepper exists
[ ] Status pills exist
[ ] Main workspace padding is consistent
[ ] Cards use consistent background and border
[ ] Primary buttons use orange
[ ] Success states use green
[ ] Risk/fail states use red
[ ] Warning states use yellow/orange
[ ] Info/demo states use blue
```

---

## 4. Top Bar Checklist

```text
[ ] OathFi logo/name visible
[ ] Subtitle visible
[ ] BTC/USDT ticker visible
[ ] ETH/USDT ticker visible
[ ] HTX/USDT ticker visible
[ ] HTX API Connected visible
[ ] Agent Running visible
[ ] Risk Mode Guarded visible
[ ] Demo Mode ON visible
[ ] Language toggle visible
```

---

## 5. Sidebar Checklist

```text
[ ] Command Center
[ ] Market Monitor
[ ] Agent Lab
[ ] Backtest Studio
[ ] Risk Firewall
[ ] Paper Execution
[ ] Audit Reports
[ ] HTX Ecosystem
[ ] Settings
[ ] Active item highlighted in orange
[ ] Sidebar footer shows version
[ ] Sidebar footer shows operational status
```

---

## 6. Workflow Stepper Checklist

```text
[ ] Market Event
[ ] AI Hypothesis
[ ] Backtest
[ ] Risk Check
[ ] Paper Trade
[ ] Review
[ ] Current step highlighted
[ ] Completed steps marked
[ ] Pending steps muted
[ ] Present on all major pages
```

---

## 7. i18n Checklist

```text
[ ] English mode works
[ ] Chinese mode works
[ ] Language switch persists after refresh
[ ] All navigation labels translate
[ ] All top bar labels translate
[ ] All workflow labels translate
[ ] All page titles translate
[ ] All buttons translate
[ ] All status pills translate
[ ] All table headers translate
[ ] All empty states translate
[ ] All error states translate
[ ] No mojibake / 乱码
[ ] Chinese font renders correctly
[ ] No random Chinese-English mixing
[ ] No hardcoded user-facing copy in JSX/TSX
```

---

## 8. Command Center Checklist

```text
[ ] Market Pulse card exists
[ ] Agent Status card exists
[ ] Risk Summary card exists
[ ] Active Market Events exists
[ ] Main Opportunity Card exists
[ ] Mini chart / order book snapshot exists
[ ] Recent Agent Decisions / Audit Trail exists
[ ] Primary CTA: Generate Hypothesis
[ ] Looks similar to reference Command Center image
```

---

## 9. Market Monitor Checklist

```text
[ ] ETH/USDT market header exists
[ ] Candlestick chart exists
[ ] Timeframe tabs exist
[ ] Chart toolbar exists
[ ] Moving averages visible
[ ] Volume bars visible
[ ] Event markers visible
[ ] Order Book exists
[ ] Trades Stream exists
[ ] Indicators Panel exists
[ ] Market Event Timeline exists
[ ] Looks similar to reference Market Monitor image
```

---

## 10. Agent Lab Checklist

```text
[ ] Market Context panel exists
[ ] Agent Reasoning Panel exists
[ ] AI Summary exists
[ ] Breakout Validity exists
[ ] Confidence exists
[ ] Hypothesis A exists
[ ] Hypothesis B exists
[ ] Hypothesis C exists
[ ] Each hypothesis has Trigger
[ ] Each hypothesis has Invalidation
[ ] Each hypothesis has Risk
[ ] Each hypothesis has Backtest Rule
[ ] Each hypothesis has Suggested Action
[ ] Strategy Rule Editor exists
[ ] Send to Backtest button exists
[ ] Page is not a chatbot
[ ] Looks similar to reference Agent Lab image
```

---

## 11. Backtest Studio Checklist

```text
[ ] Strategy Rule card exists
[ ] Entry Conditions visible
[ ] Exit Conditions visible
[ ] Backtest Result metrics visible
[ ] Win Rate visible
[ ] Profit Factor visible
[ ] Expected Value visible
[ ] Max Drawdown visible
[ ] Total Trades visible
[ ] Average R/R visible
[ ] Sample Quality visible
[ ] Sharpe Ratio visible
[ ] Backtest Verdict visible
[ ] Equity Curve visible
[ ] Drawdown Curve visible
[ ] Trade Distribution visible
[ ] Trade List visible
[ ] Send to Risk Firewall button exists
[ ] Looks similar to reference Backtest Studio image
```

---

## 12. Risk Firewall Checklist

```text
[ ] Risk Decision card exists
[ ] APPROVED FOR PAPER TRADING or PAPER ONLY visible
[ ] Live Trading Disabled visible
[ ] Risk Level visible
[ ] Position Sizing panel exists
[ ] Account Equity visible
[ ] Risk Per Trade visible
[ ] Suggested Position Size visible
[ ] Max Loss visible
[ ] Rule-by-Rule Evaluation exists
[ ] PASS / WARNING / FAIL statuses visible
[ ] Final Risk Decision exists
[ ] Send to Paper Execution button exists
[ ] Reject Strategy button exists
[ ] Return to Agent Lab button exists
[ ] Looks similar to reference Risk Firewall image
```

---

## 13. Paper Execution Checklist

```text
[ ] Order Ticket exists
[ ] Execution Preview exists
[ ] Active Paper Positions exists
[ ] Execution Log exists
[ ] No real funds involved visible
[ ] Paper Trading Only visible
[ ] Live Trading Disabled visible
[ ] Execute Paper Trade is not real live trading
```

---

## 14. Audit Reports Checklist

```text
[ ] Report List exists
[ ] Report Detail exists
[ ] Market Event section exists
[ ] Agent Hypothesis section exists
[ ] Backtest Result section exists
[ ] Risk Firewall section exists
[ ] Execution section exists
[ ] Review section exists
[ ] Copy Summary action exists
[ ] Open Audit Log action exists
```

---

## 15. HTX Ecosystem Checklist

```text
[ ] HTX API Integration panel exists
[ ] Ticker status visible
[ ] Kline status visible
[ ] Order Book status visible
[ ] Trades status visible
[ ] AI Compute Layer panel exists
[ ] B.AI planned/provider status visible
[ ] $HTX Utility Model visible
[ ] Future Ecosystem Roadmap visible
[ ] Unimplemented items marked as Planned
```

---

## 16. Settings Checklist

```text
[ ] Data Source settings exist
[ ] Agent settings exist
[ ] Risk settings exist
[ ] Demo Mode settings exist
[ ] Language settings exist
[ ] Live Trading remains disabled by default
```

---

## 17. Safety Checklist

```text
[ ] No real API secret exposed
[ ] No wallet private key exposed
[ ] No exchange secret exposed
[ ] No profit guarantee text
[ ] No live trading default
[ ] No misleading real execution language
[ ] Mock data clearly belongs to demo mode
```

---

## 18. Final Visual Checklist

```text
[ ] UI matches dark professional reference images
[ ] Layout is dense but readable
[ ] Cards are aligned
[ ] Tables are compact
[ ] Charts feel realistic
[ ] Sidebar and top bar are consistent
[ ] No generic SaaS look
[ ] No random Web3 decoration
[ ] No broken responsive layout on desktop
```

---

## 19. Final Completion Report Required

Codex must output:

```text
Files changed:
Files added:
Components created:
i18n keys added:
Build result:
Lint result:
Known limitations:
Next recommended step:
```
