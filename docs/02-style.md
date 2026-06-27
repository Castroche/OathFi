# OathFi Frontend UI Style Guide

> This file is the visual authority for the OathFi frontend.  
> The final UI must match the generated reference screens: dark, dense, professional, institutional, trading-terminal style.

---

## 1. Visual Target

The UI must look like:

```text
A professional dark-mode AI trading research terminal
A real-time market monitoring system
An institutional risk-control dashboard
An AI Agent workflow console
```

It must visually match the generated screenshots:

```text
Command Center: dense dashboard with market pulse, agent status, risk summary, event cards, opportunity card, audit trail
Market Monitor: professional K-line, order book, trades stream, indicators, market event timeline
Agent Lab: structured market context, AI reasoning, hypothesis cards, strategy rule editor
Backtest Studio: strategy rule, backtest metrics, equity curve, drawdown, trade distribution, trade list
Risk Firewall: risk decision, position sizing, rule-by-rule evaluation, final risk decision
```

---

## 2. Design Keywords

```text
dark
professional
institutional
dense
precise
real-time
auditable
structured
risk-aware
terminal-like
```

---

## 3. Design Must Avoid

```text
generic SaaS dashboard
landing page hero section
cute Web3 illustrations
oversized gradients
random neon glow
cartoon icons
chatbot-only interface
large empty cards
mobile-first consumer finance look
```

---

## 4. Color System

### Background

```css
--bg-primary: #030304;
--bg-secondary: #080A0D;
--bg-sidebar: #05070A;
--bg-panel: #0E1116;
--bg-panel-hover: #141922;
--bg-elevated: #181D26;
--bg-input: #0A0E14;
```

### Border

```css
--border-subtle: #1C222B;
--border-default: #242A35;
--border-strong: #343C4A;
--border-active: rgba(247, 147, 26, 0.55);
```

### Text

```css
--text-primary: #F5F7FA;
--text-secondary: #C7CDD6;
--text-muted: #9CA3AF;
--text-disabled: #5F6773;
```

### Accent

```css
--accent-orange: #F7931A;
--accent-orange-hover: #FF9F2E;
--accent-green: #00E0A4;
--accent-blue: #4DA3FF;
--accent-yellow: #FFB020;
--accent-red: #FF4D4F;
--accent-purple: #9B5CFF;
```

### Semantic

```css
--success: #22C55E;
--warning: #F59E0B;
--danger: #EF4444;
--info: #3B82F6;
--neutral: #64748B;
```

---

## 5. Color Usage

### Orange

Use for:

```text
Primary CTA
Active sidebar item
Current workflow step
Important action
OathFi brand accent
```

Examples:

```text
Generate Hypothesis
Send to Backtest
Send to Risk Firewall
Send to Paper Execution
```

### Green

Use for:

```text
Connected
Passed
Approved
Profit
Healthy liquidity
Positive price movement
```

### Red

Use for:

```text
Loss
Rejected
Failed
Disabled
Risk
Negative price movement
```

### Yellow / Orange Warning

Use for:

```text
Medium risk
Warning
Guarded mode
Conditional approval
```

### Blue

Use for:

```text
Demo mode
Info state
Neutral event
System notice
```

---

## 6. Typography

### Font Stack

```css
font-family: Inter, "Noto Sans SC", "Microsoft YaHei", sans-serif;
```

### Monospace

```css
font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
```

Use monospace for:

```text
Prices
PnL
Timestamps
Logs
Order book values
Backtest table values
```

### Sizes

```css
--text-xs: 12px;
--text-sm: 13px;
--text-base: 14px;
--text-md: 15px;
--text-lg: 18px;
--text-xl: 22px;
--text-2xl: 26px;
```

Rules:

```text
Page title: 22–26px
Card title: 15–16px
Body text: 13–14px
Table text: 12–13px
Large market price: 22–28px
```

Do not use marketing-style huge text.

---

## 7. Global Layout

### App Shell

```text
TopBar: 64px
Sidebar: 220px
MainWorkspace: remaining width
Main padding: 20px 24px 24px
```

### Top Bar Must Include

```text
OathFi
HTX Ecosystem AI Trading Research & Risk Agent
BTC/USDT ticker
ETH/USDT ticker
HTX/USDT ticker
HTX API Connected
Agent Running
Risk Mode Guarded
Demo Mode ON
```

### Sidebar Order

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

Sidebar footer:

```text
Version 1.0.0
All Systems Operational
```

---

## 8. Workflow Stepper

Every main page must show:

```text
Market Event → AI Hypothesis → Backtest → Risk Check → Paper Trade → Review
```

State rules:

```text
Current: orange
Completed: green check
Pending: muted gray
Rejected / failed: red
```

---

## 9. Cards

Card base style:

```css
background: var(--bg-panel);
border: 1px solid var(--border-default);
border-radius: 12px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
```

Header format:

```text
Icon + Title + Optional action link
```

Cards should be dense and useful. Avoid empty decoration.

---

## 10. Buttons

### Primary

```css
background: var(--accent-orange);
color: #FFFFFF;
```

Use for primary forward actions.

### Secondary

```css
background: transparent;
border: 1px solid var(--border-strong);
color: var(--text-secondary);
```

### Danger

```css
background: rgba(239, 68, 68, 0.16);
border: 1px solid rgba(239, 68, 68, 0.55);
color: var(--danger);
```

### Success

```css
background: rgba(34, 197, 94, 0.16);
border: 1px solid rgba(34, 197, 94, 0.55);
color: var(--success);
```

---

## 11. Status Pills

Examples:

```text
HTX API Connected
Agent Running
Risk Mode Guarded
Demo Mode ON
Paper Trading Only
Live Trading Disabled
Backtest Ready
Risk Firewall Active
```

Pill style:

```text
compact
bordered
low-height
high contrast
icon + text
```

---

## 12. Charts

### Candlestick Chart

Must look professional.

Include:

```text
Dark grid
Green/red candles
Volume bars
MA20 orange
MA50 blue
MA200 purple
Current price line
Event markers
Timeframe tabs
Chart toolbar
```

Event labels:

```text
Volume Spike
Breakout Watch
Agent Analysis
Risk Alert
```

### Backtest Charts

Include:

```text
Equity Curve
Drawdown Curve
Trade Distribution
```

Use clean axes and color-coded annotations.

---

## 13. Tables

Tables must be compact.

Rules:

```text
Row height: 34–40px
Header text: muted gray
Values: monospace
PnL positive: green
PnL negative: red
Warnings: yellow
Row hover: subtle background
```

---

## 14. Page Layouts

### Command Center

Required panels:

```text
Market Pulse
Agent Status
Risk Summary
Active Market Events
Main Opportunity Card
Mini Chart / Order Book
Recent Agent Decisions / Audit Trail
```

### Market Monitor

Required panels:

```text
ETH/USDT chart
Order Book
Trades Stream
Indicators Panel
Market Event Timeline
```

### Agent Lab

Required panels:

```text
Market Context
Agent Reasoning Panel
Hypothesis Cards
Convert to Strategy Rule
Strategy Preview
```

### Backtest Studio

Required panels:

```text
Strategy Rule
Backtest Result
Backtest Verdict
Equity Curve
Drawdown Curve
Trade Distribution
Trade List
```

### Risk Firewall

Required panels:

```text
Risk Decision
Position Sizing
Rule-by-Rule Evaluation
Final Risk Decision
```

### Paper Execution

Required panels:

```text
Order Ticket
Execution Preview
Active Paper Positions
Execution Log
```

### Audit Reports

Required panels:

```text
Report List
Report Detail
Audit Timeline
```

### HTX Ecosystem

Required panels:

```text
HTX API Integration
AI Compute Layer
$HTX Utility Model
Future Ecosystem Roadmap
```

### Settings

Required panels:

```text
Data Source
Agent Settings
Risk Settings
Demo Mode
Language Settings
```

---

## 15. Interaction Style

Every page should have one obvious forward action.

Examples:

```text
Command Center → Generate Hypothesis
Agent Lab → Send to Backtest
Backtest Studio → Send to Risk Firewall
Risk Firewall → Send to Paper Execution
Paper Execution → Generate Review Report
```

Do not show many competing primary buttons.

---

## 16. Visual QA Standard

A finished page must be visually similar to the generated reference images:

```text
Dense dark layout
Orange active states
Green/red trading values
Professional chart panels
Sidebar + top bar consistency
High-information but readable
No generic SaaS look
```
