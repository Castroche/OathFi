# OathFi Technical Stack Rules

---

## 1. Primary Rule

Codex must not change the existing project framework without explicit approval.

If the project is already built with:

```text
React
Next.js
Vite
TypeScript
Tailwind
```

then Codex must keep the existing structure and adapt within it.

---

## 2. Required Frontend Principles

The frontend must be:

```text
Type-safe
Componentized
Theme-token driven
Internationalized
Responsive for desktop-first usage
Buildable
Lintable
Maintainable
```

---

## 3. Recommended Core Stack

Use the existing stack where possible.

Preferred stack:

```text
TypeScript
React
Next.js or Vite depending on current project
Tailwind CSS
CSS variables
lucide-react
class-variance-authority
tailwind-merge
```

---

## 4. Internationalization

If project uses Next.js:

```text
next-intl
```

If project uses React + Vite:

```text
i18next
react-i18next
i18next-browser-languagedetector
```

Do not implement a custom i18n system unless the project already has one.

---

## 5. State Management

Preferred:

```text
zustand
```

Use for:

```text
Selected language
Selected market symbol
Demo mode state
Workflow step state
UI layout state
```

Do not use Redux unless the project already uses Redux.

---

## 6. Server State / API State

Preferred:

```text
@tanstack/react-query
```

Use for:

```text
Market data queries
Backtest result queries
Agent analysis queries
Risk check result queries
Audit reports
```

If the project already has another API state pattern, follow existing architecture.

---

## 7. Charts

### K-line / Trading Chart

Preferred:

```text
lightweight-charts
```

Use for:

```text
Candlestick chart
Volume bars
Moving averages
Price line
Event markers
```

### General Data Visualization

Preferred:

```text
recharts
```

Use for:

```text
Equity curve
Drawdown curve
Trade distribution
Risk score
Backtest metrics visualization
```

Do not use heavy charting systems unless required.

---

## 8. Icons

Preferred:

```text
lucide-react
```

Use one icon system only.

Do not mix:

```text
lucide
heroicons
fontawesome
antd icons
mui icons
```

unless existing project already does.

---

## 9. UI Library Policy

Allowed:

```text
Custom components
Radix UI primitives if needed
shadcn/ui if already installed or explicitly approved
```

Not allowed by default:

```text
Ant Design
Material UI
Bootstrap
Chakra UI
DaisyUI
Preline
Admin templates
Random dashboard templates
```

Reason:

Large UI libraries may make the app look generic and inconsistent with the target terminal style.

---

## 10. Styling Rules

Preferred:

```text
Tailwind CSS
CSS variables
Reusable class utilities
```

Use design tokens from `docs/02-style.md`.

Do not hardcode random colors in components.

Bad:

```tsx
<div className="bg-[#123456] text-[#abcdef]">
```

Good:

```tsx
<div className="bg-oath-panel text-oath-text">
```

or use CSS variables:

```css
background: var(--bg-panel);
color: var(--text-primary);
```

---

## 11. Suggested Folder Structure

Adapt to existing project, but prefer:

```text
src/
  app/ or pages/
  components/
    layout/
    common/
    cards/
    market/
    agent/
    backtest/
    risk/
    execution/
    audit/
    ecosystem/
  i18n/
    messages/
      en.json
      zh-CN.json
  stores/
  hooks/
  lib/
  styles/
  types/
  mock/
```

---

## 12. Component Groups

### Layout

```text
AppShell
TopBar
Sidebar
WorkflowStepper
BottomStatusBar
```

### Common

```text
StatusPill
MetricCard
SectionCard
DataTable
ActionButton
EmptyState
LoadingState
ErrorState
```

### Market

```text
MarketTickerChip
CandlestickChart
OrderBook
TradesStream
IndicatorPanel
MarketEventTimeline
```

### Agent

```text
MarketContextPanel
AgentReasoningPanel
HypothesisCard
StrategyRuleEditor
StrategyPreview
```

### Backtest

```text
BacktestMetrics
EquityCurve
DrawdownCurve
TradeDistribution
TradeList
BacktestVerdict
```

### Risk

```text
RiskDecisionCard
PositionSizingCard
RiskRuleTable
FinalRiskDecision
```

### Execution

```text
OrderTicket
ExecutionPreview
PaperPositions
ExecutionLog
```

### Audit

```text
ReportList
ReportDetail
AuditTimeline
```

---

## 13. Build Commands

Codex must detect actual package scripts.

Typical scripts:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

If missing, Codex must report missing scripts rather than inventing success.

---

## 14. Mock Data Rules

Mock data is allowed for UI demo.

Mock data must be isolated:

```text
src/mock/
src/lib/mock/
```

Do not scatter mock values across components.

Mock data must clearly support:

```text
Demo Mode ON
Paper Trading Only
Live Trading Disabled
```

---

## 15. Security Rules

Never expose:

```text
API Secret
Exchange private key
Wallet private key
Mnemonic
JWT secret
Database URL
```

Frontend can use public demo values only.

All sensitive values must be read from environment variables or backend only.

---

## 16. Migration Rule

Codex must not migrate framework, package manager, or styling engine without explicit approval.

Forbidden without approval:

```text
Vite → Next.js
Next.js → Vite
CSS Modules → Tailwind
Tailwind → MUI
npm → pnpm
pnpm → npm
```

If migration seems necessary, Codex must propose it first and wait.
