# OathFi Codex Instructions

> This is the highest-level instruction file for Codex / Claude Code / Cursor.  
> Codex must read this file first, then follow the numbered documents in order.

---

## 1. Read Order

Codex must read the documentation in this exact order:

```text
docs/00-codex-instructions.md
docs/01-product-brief.md
docs/02-style.md
docs/03-tech-stack.md
docs/04-i18n-rules.md
docs/05-frontend-constraints.md
docs/06-acceptance-checklist.md
```

If any instruction conflicts, the file with the lower number has higher priority.

Example:

```text
01-product-brief.md overrides 02-style.md
02-style.md overrides 03-tech-stack.md
04-i18n-rules.md overrides component-level text decisions
05-frontend-constraints.md overrides Codex assumptions
```

---

## 2. First Codex Task

Before editing code, Codex must:

1. Read all files in `docs/`.
2. Inspect the existing frontend architecture.
3. Identify the current framework: Next.js / React / Vite / other.
4. Identify routing, styling, component structure, i18n status, build commands, and lint commands.
5. Output an implementation plan.
6. Wait for user approval before modifying code.

Codex must not modify files during the initial audit.

---

## 3. Product Name

The only valid product name is:

```text
OathFi
```

Legacy product names are forbidden.

```text
Do not use any previous working title.
```

Previous working titles must not appear in the app UI, metadata, routes, titles, comments, mocks, docs, or README.

---

## 4. Core Design Target

The final UI must visually match the generated reference screens:

```text
Dark professional trading terminal
Left sidebar navigation
Top market ticker bar
HTX API / Agent / Risk / Demo status pills
Dense institutional dashboard cards
TradingView-like chart density
Structured AI Agent workflow
Risk Firewall as a serious institutional review screen
```

The interface must look like a real production-grade AI trading research and risk-control terminal, not a generic SaaS dashboard.

---

## 5. Mandatory Global App Shell

Every primary page must use the same shell:

```text
TopBar
Sidebar
MainWorkspace
WorkflowStepper
Optional BottomStatusBar
```

The following must be persistent:

```text
OathFi logo and name
Ticker chips
HTX API Connected
Agent Running
Risk Mode Guarded
Demo Mode ON
Sidebar navigation
Workflow stepper
```

---

## 6. Development Rules

Codex must work in stages.

Recommended stage order:

```text
Stage 0: Audit only, no code edits
Stage 1: AppShell + tokens + i18n
Stage 2: Command Center
Stage 3: Market Monitor
Stage 4: Agent Lab
Stage 5: Backtest Studio
Stage 6: Risk Firewall
Stage 7: Paper Execution
Stage 8: Audit Reports
Stage 9: HTX Ecosystem + Settings
Stage 10: QA, lint, build, i18n check
```

Do not implement all pages in one uncontrolled patch.

---

## 7. Required Report After Every Coding Stage

After each coding stage, Codex must report:

```text
1. Files changed
2. Files added
3. Components added
4. Old product name search result
5. i18n hardcoded text check
6. Build result
7. Lint result
8. Known issues
9. Next recommended stage
```

---

## 8. Hard Requirements

Codex must ensure:

```text
[ ] Product name is OathFi everywhere
[ ] No old product name remains
[ ] English / Chinese language switch works
[ ] No mojibake /乱码
[ ] No hardcoded UI copy in JSX/TSX
[ ] Demo Mode ON is visible
[ ] Paper Trading Only is visible on execution pages
[ ] Live Trading Disabled is visible
[ ] Agent Lab is not a chatbot
[ ] Risk Firewall has rule-by-rule evaluation
[ ] UI follows docs/02-style.md
[ ] npm run build passes
[ ] npm run lint passes
```

---

## 9. Forbidden Behavior

Codex must not:

1. Rewrite the entire project without approval.
2. Change the frontend framework without approval.
3. Introduce unrelated pages.
4. Introduce real trading by default.
5. Hardcode Chinese or English UI text.
6. Add fake profit guarantees.
7. Add API secrets into frontend files.
8. Break existing backend contracts without explanation.
9. Use large UI libraries that conflict with the desired custom terminal style.
10. Create a landing page instead of the application interface.

---

## 10. Final Objective

Every screen must support this product question:

> How does OathFi convert market events into testable, backtested, risk-controlled trading decisions?

If a UI element does not support this answer, remove it.
