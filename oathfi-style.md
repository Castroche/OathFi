# OathFi Frontend UI Style Guide

> This document defines the mandatory frontend UI style, layout system, component rules, and page structure for **OathFi**.  
> The goal is to keep the product visually consistent with a professional dark-mode AI trading research and risk-control terminal.

---

## 0. Product Identity

### Product Name

**OathFi**

### Product Positioning

OathFi is an AI-powered trading research and risk-control agent for the HTX ecosystem.

It connects market data, detects market events, generates structured trading hypotheses, validates them through backtesting, applies a risk firewall, and executes only in paper trading / demo mode by default.

### One-line Product Description

**OathFi turns market events into verifiable, backtested, risk-controlled trading workflows.**

### UI Personality

The frontend must feel like:

- A professional institutional trading terminal.
- A structured AI agent workspace.
- A risk-auditable trading research system.
- A hackathon-ready Web3 × AI financial product.

It must **not** feel like:

- A generic Web3 landing page.
- A chatbot wrapper.
- A casual crypto dashboard.
- A gaming-style neon interface.
- A random collection of trading widgets.

---

## 1. Core Product Workflow

Every page must serve the same core workflow:

```text
HTX Market Data
→ Market Event Detection
→ AI Hypothesis Generation
→ Backtest Validation
→ Risk Firewall
→ Paper Execution
→ Audit Review
```

This workflow must appear consistently in the interface.

### Mandatory Workflow Stepper

A horizontal workflow stepper must appear near the top of every main page:

```text
Market Event → AI Hypothesis → Backtest → Risk Check → Paper Trade → Review
```

Rules:

- Current step: orange highlight.
- Completed step: green check.
- Pending step: muted gray.
- Do not remove this stepper from major pages.
- Do not invent unrelated steps.

---

## 2. Global Visual Direction

### Overall Style

Use a **dark professional trading-terminal UI**.

Design references:

- TradingView chart density and professionalism.
- OKX / Binance data-panel density.
- Bloomberg-like information compression.
- Linear / Vercel-level modern dark UI polish.
- AI agent control-panel clarity.

### Design Keywords

```text
dark
professional
institutional
compact
real-time
auditable
structured
high-density
risk-aware
```

### Avoid

```text
flashy gradients
cartoon Web3 visuals
oversized illustrations
large empty hero sections
random neon glow
cute rounded SaaS cards
generic chatbot UI
```

---

## 3. Color System

Use this palette strictly.

### Backgrounds

```css
--bg-primary: #030304;
--bg-secondary: #080A0D;
--bg-panel: #0E1116;
--bg-panel-hover: #141922;
--bg-elevated: #181D26;
--bg-sidebar: #05070A;
```

### Borders

```css
--border-subtle: #1C222B;
--border-default: #242A35;
--border-strong: #343C4A;
```

### Text

```css
--text-primary: #F5F7FA;
--text-secondary: #C7CDD6;
--text-muted: #9CA3AF;
--text-disabled: #5F6773;
```

### Accent Colors

```css
--accent-orange: #F7931A;
--accent-orange-hover: #FF9F2E;
--accent-green: #00E0A4;
--accent-blue: #4DA3FF;
--accent-yellow: #FFB020;
--accent-red: #FF4D4F;
--accent-purple: #9B5CFF;
```

### Semantic Colors

```css
--success: #22C55E;
--warning: #F59E0B;
--danger: #EF4444;
--info: #3B82F6;
--neutral: #64748B;
```

### Usage Rules

- Orange is the primary action color.
- Green means connected, passed, profitable, healthy, approved.
- Red means loss, risk, disabled, failed, rejected.
- Yellow means warning, medium risk, guarded mode.
- Blue means demo mode, info, neutral system state.
- Do not use large colorful backgrounds.
- Keep most UI dark; use color only for status, metrics, and primary actions.

---

## 4. Typography

### Font Family

Recommended:

```css
--font-sans: "Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", "Consolas", monospace;
```

### Usage

- UI labels: Inter / Noto Sans SC.
- Chinese text: Noto Sans SC or Microsoft YaHei.
- Prices, metrics, timestamps, logs: JetBrains Mono.
- Page titles: bold, clean, not oversized.

### Font Sizes

```css
--text-xs: 12px;
--text-sm: 13px;
--text-base: 14px;
--text-md: 15px;
--text-lg: 18px;
--text-xl: 22px;
--text-2xl: 26px;
```

### Type Rules

- Main page title: 22–26px.
- Card title: 15–16px.
- Table text: 12–13px.
- Market price: 18–28px depending on importance.
- Do not use huge marketing-style typography.
- Avoid thin, low-contrast text.

---

## 5. Layout System

### App Shell

All pages must use the same app shell:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar                                                      │
├──────────────┬───────────────────────────────────────────────┤
│ Sidebar      │ Main Workspace                                │
├──────────────┴───────────────────────────────────────────────┤
│ Optional Bottom Status Bar                                   │
└──────────────────────────────────────────────────────────────┘
```

### Top Bar

Height: `64px`.

Must include:

1. OathFi logo.
2. Product name: `OathFi`.
3. Subtitle: `HTX Ecosystem AI Trading Research & Risk Agent`.
4. Ticker chips:
   - BTC/USDT
   - ETH/USDT
   - HTX/USDT
5. Status pills:
   - `HTX API Connected`
   - `Agent Running`
   - `Risk Mode Guarded`
   - `Demo Mode ON`

### Sidebar

Width: `220px`.

Navigation order must be:

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

Rules:

- Active item: orange icon + orange left border + subtle dark-orange background.
- Inactive item: gray text and icon.
- Hover item: slightly brighter background.
- Sidebar footer must show:
  - `Version 1.0.0`
  - `All Systems Operational`

### Main Workspace

Recommended padding:

```css
padding: 20px 24px 24px 24px;
```

Use a dense dashboard grid. Avoid excessive whitespace.

---

## 6. Spacing and Radius

### Spacing Tokens

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

### Border Radius

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
```

Rules:

- Cards: 10–12px radius.
- Buttons: 8px radius.
- Pills: 6–999px depending on chip style.
- Avoid overly soft SaaS-style roundness.

---

## 7. Component System

## 7.1 Cards

All cards should use:

```css
background: var(--bg-panel);
border: 1px solid var(--border-default);
border-radius: var(--radius-lg);
```

Optional subtle shadow:

```css
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
```

Card structure:

```text
Card Header
- Icon
- Title
- Optional action link

Card Body
- Metrics / chart / table / explanation
```

Rules:

- Card titles must be short.
- Use small icons for section identity.
- Avoid decorative illustrations unless they serve product context.

---

## 7.2 Buttons

### Primary Button

Use orange.

```css
background: var(--accent-orange);
color: #FFFFFF;
```

Examples:

```text
Generate Hypothesis
Send to Backtest
Send to Risk Firewall
Send to Paper Execution
Execute Paper Trade
```

### Secondary Button

Dark outlined button.

```css
background: transparent;
border: 1px solid var(--border-strong);
color: var(--text-secondary);
```

Examples:

```text
View Supporting Data
Edit Rule
Return to Agent Lab
View Full Analysis
```

### Danger Button

Use red.

```css
background: rgba(239, 68, 68, 0.16);
border: 1px solid rgba(239, 68, 68, 0.55);
color: var(--danger);
```

Examples:

```text
Reject
Reject Strategy
Cancel
```

### Button Rules

- Primary action must be visually obvious.
- Do not place too many orange buttons on one page.
- Critical destructive actions must never use orange.
- Disable unavailable actions instead of hiding them.

---

## 7.3 Status Pills

Use compact status pills.

Examples:

```text
HTX API Connected
Agent Running
Risk Mode Guarded
Demo Mode ON
Live Trading Disabled
Paper Trading Only
```

Color mapping:

```text
Connected / Passed / Approved → Green
Guarded / Warning / Medium Risk → Yellow or Orange
Disabled / Failed / Rejected → Red
Demo / Info → Blue
Neutral → Gray
```

---

## 7.4 Tables

Tables must look like trading-terminal tables.

Rules:

- Compact row height: 34–40px.
- Use mono font for numbers.
- Use colored values for PnL, risk, and price movement.
- Table header text should be muted.
- Row hover should use `--bg-panel-hover`.
- Do not use heavy grid borders.

---

## 7.5 Charts

Chart style:

- Dark background.
- Thin grid lines.
- Green/red candles.
- Moving averages:
  - MA20: orange
  - MA50: blue
  - MA200: purple
- Volume bars at bottom.
- Event labels above candles.

Mandatory chart event labels:

```text
Volume Spike
Breakout Watch
Agent Analysis
Risk Alert
```

Chart must look professional and realistic, not decorative.

---

## 7.6 Order Book

Use a dense order-book layout.

Must include:

```text
Price
Size
Total
Spread
Imbalance
Liquidity Score
Depth visualization
```

Rules:

- Ask side: red.
- Bid side: green.
- Current price: large, centered, green/red depending on move.
- Depth bars should be subtle, not oversized.

---

## 7.7 Logs and Audit Trail

Use mono font for timestamps.

Example:

```text
14:34:12 Strategy received from Risk Firewall
14:34:13 Paper order created
14:34:14 Simulated fill at 3502.4
14:34:15 Audit record generated
```

Rules:

- Logs must be readable.
- Use colored dots to classify event types.
- Always show timestamps.

---

## 8. Page Specifications

## 8.1 Command Center

Purpose:

The Command Center must explain the whole product within 10 seconds.

Required sections:

1. Market Pulse
2. Agent Status
3. Risk Summary
4. Active Market Events
5. Main Opportunity Card
6. Mini Chart / Order Book Snapshot
7. Recent Agent Decisions / Audit Trail

### Layout

```text
Top: Market Pulse / Agent Status / Risk Summary
Middle: Active Market Events
Lower: Main Opportunity Card + Mini Chart / Order Book
Bottom: Recent Agent Decisions / Audit Trail
```

### Main Opportunity Card

Example content:

```text
ETH Breakout Setup

ETH is coiling below key resistance with strong higher lows,
increasing volume, and positive funding shift.

Setup Quality: 76/100
Time Horizon: 1–3 days
Confidence: Medium-High
Risk/Reward: 1 : 2.1

Primary Action:
Generate Hypothesis
```

---

## 8.2 Market Monitor

Purpose:

Show that OathFi uses real market data, not just AI-generated text.

Required sections:

1. Professional K-line chart.
2. Timeframe tabs.
3. Chart toolbar.
4. Order book.
5. Trades stream.
6. Indicators panel.
7. Market event timeline.

### Chart Must Include

```text
ETH/USDT
Current price
24h high / low
24h volume
Funding
MA20 / MA50 / MA200
Volume bars
Event labels
```

### Indicator Panel

Must include:

```text
RSI
MACD
ATR
VWAP
Volume vs 20MA
Trend Score
```

Each indicator must include:

```text
Name
Value
Status label
```

---

## 8.3 Agent Lab

Purpose:

Show that the AI is a structured trading research agent, not a chatbot.

Required sections:

1. Market Context
2. Agent Reasoning Panel
3. AI Hypothesis Generation
4. Convert to Strategy Rule

### Market Context Fields

```text
Asset
Current Price
Timeframe
Key Resistance
Volume State
RSI
MACD
Order Book
BTC Correlation
```

### Agent Reasoning Panel

Must include:

```text
Current Task
Input Sources
Output Mode
Confidence Calibration
AI Summary
Breakout Validity
Confidence
Evidence bullets
Invalidation warning
```

### Hypothesis Cards

Each hypothesis card must include:

```text
Hypothesis Name
Trigger
Invalidation
Risk
Backtest Rule
Suggested Action
Run Backtest button
Edit Rule button
Reject button
```

Recommended hypotheses:

```text
Hypothesis A: Bullish Continuation
Hypothesis B: Bull Trap Reversal
Hypothesis C: Range Expansion
```

### Strategy Rule Editor

Must include:

```text
Entry Conditions
Exit Conditions
Risk Controls
Strategy Preview
Send to Backtest button
```

---

## 8.4 Backtest Studio

Purpose:

Prove that AI hypotheses are validated with data.

Required sections:

1. Strategy Rule
2. Backtest Result
3. Backtest Verdict
4. Equity Curve
5. Drawdown Curve
6. Trade Distribution
7. Trade List
8. Send to Risk Firewall button

### Backtest Metrics

Must include:

```text
Win Rate
Profit Factor
Expected Value
Max Drawdown
Total Trades
Average R/R
Sample Quality
Sharpe Ratio
```

### Verdict States

```text
Valid
Conditionally Valid
Weak
Rejected
```

Use:

- Green for Valid.
- Yellow/Orange for Conditionally Valid.
- Red for Rejected.

---

## 8.5 Risk Firewall

Purpose:

Show that OathFi does not blindly execute AI suggestions.

Required sections:

1. Risk Decision
2. Position Sizing
3. Rule-by-Rule Evaluation
4. Final Risk Decision

### Risk Decision Statuses

```text
APPROVED
APPROVED WITH LIMIT
PAPER ONLY
APPROVED FOR PAPER TRADING
REJECTED
```

Default for demo:

```text
APPROVED FOR PAPER TRADING
Live Trading: Disabled
Paper Trading Only
```

### Rule-by-Rule Evaluation

Required checks:

```text
Backtest Expectancy Positive
Max Drawdown Below Threshold
Sample Size Sufficient
Liquidity Score
Spread Acceptable
Volatility Not Extreme
BTC Correlation Risk
Resistance Not Nearby
```

Each row must show:

```text
Rule
Threshold
Actual
Status
Notes
```

Status values:

```text
PASS
WARNING
FAIL
```

---

## 8.6 Paper Execution

Purpose:

Show controlled simulated execution without real funds.

Required sections:

1. Order Ticket
2. Execution Preview
3. Active Paper Positions
4. Execution Log

### Mandatory Text

The page must visibly show:

```text
No real funds involved.
Paper Trading Only.
Live Trading Disabled.
```

### Order Ticket Fields

```text
Symbol
Side
Entry Type
Entry Price
Stop Loss
Take Profit
Position Size
Risk
Mode
```

---

## 8.7 Audit Reports

Purpose:

Show that every AI decision is explainable and reviewable.

Required sections:

1. Report List
2. Report Detail

### Report Detail Must Include

```text
Market Event
Agent Hypothesis
Backtest Result
Risk Firewall
Execution
Review
```

### Actions

```text
Copy Summary
Open Audit Log
```

Do not add PDF export unless it is actually implemented.

---

## 8.8 HTX Ecosystem

Purpose:

Show explicit HTX ecosystem fit.

Required sections:

1. HTX API Integration
2. AI Compute Layer
3. $HTX Utility Model
4. Future Ecosystem Roadmap

### HTX API Integration

Show statuses:

```text
Ticker: Connected
Kline: Connected
Order Book: Connected
Trades: Connected
Account Read-only: Planned
Live Trading: Disabled
```

### AI Compute Layer

Show:

```text
Current Provider: Demo / Local / Configurable
Planned Provider: B.AI
Use Cases:
- Agent reasoning
- Hypothesis generation
- Risk explanation
- Report generation
```

### $HTX Utility Model

Show as roadmap / model, not as completed if not implemented.

```text
Free: limited reports
HTX Holder: advanced backtest
HTX Pro: team workspace and audit logs
```

---

## 8.9 Settings

Purpose:

Configure data, agent, risk, and demo mode.

Required sections:

1. Data Source
2. Agent Settings
3. Risk Settings
4. Demo Mode

### Default Settings

```text
HTX API: Public Market Data
WebSocket: Enabled
REST Fallback: Enabled
Paper Trading: Enabled
Live Trading: Disabled
Demo Mode: ON
```

---

## 9. Language Rules

### Main UI Language

Use English for the demo UI unless the product is explicitly switched to Chinese.

Reason:

- Hackathon judging materials may be international.
- English labels look cleaner in trading terminal UI.
- Technical terms are shorter and clearer.

### Allowed Mixed Usage

Chinese can be used in internal notes or Chinese version, but avoid random Chinese/English mixing in the same component.

Bad:

```text
AI置信度 Confidence: 中高
```

Good:

```text
Confidence: Medium-High
```

or

```text
置信度：中高
```

Pick one language per screen.

### Product Name Rule

Always use:

```text
OathFi
```

Never use previous working titles.

```text
Use OathFi everywhere.
```

Do not keep legacy names in archived notes, migration comments, UI, metadata, routes, mocks, or docs.

---

## 10. Data Display Rules

### Use Realistic Demo Values

Use realistic placeholder values if live data is not available.

Examples:

```text
BTC/USDT 67,241.8 -1.23%
ETH/USDT 3,412.67 +2.35%
HTX/USDT 0.00000182 -0.74%
```

### Always Mark Demo Mode

If values are simulated, show:

```text
Demo Mode ON
Paper Trading Only
```

Do not imply real execution if not implemented.

### No Profit Guarantees

Do not use phrases like:

```text
Guaranteed profit
稳赚
High certainty profit
AI guaranteed win
```

Use:

```text
Hypothesis
Backtest
Risk Review
Paper Execution
```

---

## 11. Interaction Rules

### Guided Demo Flow

There must be a visible `Start Demo Flow` entry point on Command Center.

The demo flow should progress:

```text
Command Center
→ Market Monitor
→ Agent Lab
→ Backtest Studio
→ Risk Firewall
→ Paper Execution
→ Audit Reports
```

Each step should have a clear next action:

```text
Generate Hypothesis
Run Backtest
Send to Risk Firewall
Send to Paper Execution
Generate Review Report
```

### Disabled States

If a feature is not implemented:

- Show disabled state.
- Add label: `Planned`, `Coming Soon`, or `Disabled`.
- Do not create fake clickable buttons that do nothing.

### Loading States

Use compact terminal-like loading states:

```text
Syncing HTX WebSocket...
Generating Hypothesis...
Running Backtest...
Checking Risk Rules...
Creating Paper Order...
```

---

## 12. Implementation Guidelines

### Preferred Stack

If using React / Next.js / Tailwind:

- Use componentized layout.
- Use CSS variables for tokens.
- Keep components reusable.
- Avoid inline random colors.
- Avoid hardcoded spacing everywhere.

### Suggested Component Structure

```text
components/
  layout/
    AppShell.tsx
    TopBar.tsx
    Sidebar.tsx
    WorkflowStepper.tsx
    StatusPill.tsx

  cards/
    MetricCard.tsx
    MarketPulseCard.tsx
    AgentStatusCard.tsx
    RiskSummaryCard.tsx
    OpportunityCard.tsx

  market/
    CandlestickChart.tsx
    OrderBook.tsx
    TradesStream.tsx
    IndicatorPanel.tsx
    MarketEventTimeline.tsx

  agent/
    MarketContextPanel.tsx
    AgentReasoningPanel.tsx
    HypothesisCard.tsx
    StrategyRuleEditor.tsx

  backtest/
    BacktestMetrics.tsx
    EquityCurve.tsx
    DrawdownCurve.tsx
    TradeDistribution.tsx
    TradeList.tsx

  risk/
    RiskDecisionCard.tsx
    PositionSizingCard.tsx
    RiskRuleTable.tsx
    FinalRiskDecision.tsx

  execution/
    OrderTicket.tsx
    ExecutionPreview.tsx
    PaperPositions.tsx
    ExecutionLog.tsx

  audit/
    ReportList.tsx
    ReportDetail.tsx
```

### Suggested Routes

```text
/
  command-center

/market
/agent-lab
/backtest
/risk-firewall
/paper-execution
/audit-reports
/htx-ecosystem
/settings
```

---

## 13. Tailwind Token Suggestions

If using Tailwind, extend config with OathFi tokens.

```js
theme: {
  extend: {
    colors: {
      oath: {
        bg: "#030304",
        bg2: "#080A0D",
        panel: "#0E1116",
        panelHover: "#141922",
        border: "#242A35",
        text: "#F5F7FA",
        muted: "#9CA3AF",
        orange: "#F7931A",
        green: "#00E0A4",
        blue: "#4DA3FF",
        yellow: "#FFB020",
        red: "#FF4D4F"
      }
    },
    fontFamily: {
      sans: ["Inter", "Noto Sans SC", "Microsoft YaHei", "sans-serif"],
      mono: ["JetBrains Mono", "SF Mono", "Consolas", "monospace"]
    },
    borderRadius: {
      card: "12px"
    }
  }
}
```

---

## 14. Mandatory UI Text Replacements

Replace every old product name with:

```text
OathFi
```

### Replace

```text
Previous working title → OathFi
Legacy product title → OathFi
HTX Ecosystem AI Trading Research & Risk Agent → HTX Ecosystem AI Trading Research & Risk Agent
```

The subtitle may remain:

```text
HTX Ecosystem AI Trading Research & Risk Agent
```

Recommended top-left brand block:

```text
OathFi
HTX Ecosystem AI Trading Research & Risk Agent
```

---

## 15. Prohibited UI Decisions

Do not:

1. Build a landing page instead of an app interface.
2. Use large hero illustrations.
3. Make the UI look like a generic SaaS dashboard.
4. Turn Agent Lab into a simple chat window.
5. Hide the risk workflow.
6. Allow live trading by default.
7. Show fake guaranteed profit.
8. Mix Chinese and English randomly.
9. Use large gradients as the primary visual identity.
10. Use too much empty space.
11. Replace the sidebar navigation order.
12. Remove the workflow stepper.
13. Rename OathFi.
14. Introduce unrelated pages such as NFT, wallet, social feed, DAO governance, or meme-token launch unless explicitly requested.
15. Use inconsistent card styles across pages.

---

## 16. Quality Checklist

Before shipping any frontend UI update, verify:

```text
[ ] Product name is OathFi everywhere.
[ ] Top bar is consistent across all pages.
[ ] Sidebar order is unchanged.
[ ] Workflow stepper exists on all main pages.
[ ] Dark palette follows this style guide.
[ ] Primary actions use orange.
[ ] Risk and loss states use red.
[ ] Success and connected states use green.
[ ] Demo Mode ON is visible.
[ ] Live Trading Disabled is visible where execution is discussed.
[ ] Agent Lab uses structured hypotheses, not chat.
[ ] Backtest page includes win rate, profit factor, expected value, max drawdown, total trades.
[ ] Risk Firewall includes rule-by-rule evaluation.
[ ] Paper Execution clearly says no real funds are involved.
[ ] Audit Reports include market event, hypothesis, backtest, risk, execution, and review.
[ ] No old product name remains.
[ ] No random decorative Web3 visuals are present.
```

---

## 17. Final Design Principle

Every screen must answer one question:

> How does OathFi convert market events into testable, backtested, risk-controlled trading decisions?

If a UI element does not support this answer, remove it.
