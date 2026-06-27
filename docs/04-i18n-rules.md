# OathFi Internationalization Rules

---

## 1. Goal

OathFi must support free switching between:

```text
English
简体中文
```

The UI must not show mojibake,乱码, broken text, random language mixing, or missing translations.

---

## 2. Mandatory Rule

All user-facing UI text must come from i18n messages.

Do not hardcode UI copy inside:

```text
.tsx
.jsx
.ts
.js
```

Bad:

```tsx
<button>Generate Hypothesis</button>
<button>生成交易假设</button>
```

Good:

```tsx
<button>{t("actions.generateHypothesis")}</button>
```

---

## 3. Suggested Language Files

Preferred structure:

```text
src/i18n/messages/en.json
src/i18n/messages/zh-CN.json
```

Alternative for Next.js:

```text
messages/en.json
messages/zh-CN.json
```

Codex must follow the existing project convention if one exists.

---

## 4. Required Translation Namespaces

Language files must cover:

```text
common
brand
navigation
topBar
workflow
status
actions
tables
commandCenter
marketMonitor
agentLab
backtestStudio
riskFirewall
paperExecution
auditReports
htxEcosystem
settings
errors
emptyStates
loadingStates
```

---

## 5. Language Toggle

The app must include a visible language switcher.

Allowed labels:

```text
EN / 中文
English / 简体中文
```

Requirements:

```text
Selected language persists after refresh
Selected language persists in localStorage
Default language can be browser language or English
All visible UI updates immediately after switching
```

---

## 6. HTML Language Attribute

The document language must update:

```html
<html lang="en">
<html lang="zh-CN">
```

If the framework does not allow direct manipulation, Codex must implement the closest supported equivalent.

---

## 7. Encoding Rules

All text files must be UTF-8.

Required:

```text
.ts
.tsx
.js
.jsx
.json
.css
.md
.html
```

If the project has `index.html`, ensure:

```html
<meta charset="UTF-8" />
```

---

## 8. Font Rules

Use font stack:

```css
font-family: Inter, "Noto Sans SC", "Microsoft YaHei", sans-serif;
```

Use monospace stack for numbers:

```css
font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
```

Reason:

```text
Inter alone does not fully cover Chinese.
A Chinese fallback is required to avoid missing glyphs.
```

---

## 9. No Random Mixed Language

Bad:

```text
AI置信度 Confidence: 中高
风险 Mode: Guarded
执行 Paper Trading Only
```

Good English:

```text
Confidence: Medium-High
Risk Mode: Guarded
Execution Mode: Paper Trading Only
```

Good Chinese:

```text
置信度：中高
风控模式：守护模式
执行模式：仅模拟交易
```

Pick one language per selected locale.

---

## 10. Terms That Should Not Be Translated

These are technical symbols and should remain unchanged:

```text
BTC/USDT
ETH/USDT
HTX/USDT
USDT
BTC
ETH
HTX
RSI
MACD
ATR
VWAP
PnL
R/R
API
WebSocket
REST
AI
HTX
B.AI
```

---

## 11. Numbers and Formats

Use locale-aware formatting.

Use:

```ts
Intl.NumberFormat
```

For price:

```ts
new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
```

For percent:

```ts
new Intl.NumberFormat(locale, {
  style: "percent",
  maximumFractionDigits: 2
})
```

For dates:

```ts
Intl.DateTimeFormat
```

Do not manually concatenate localized date strings.

---

## 12. Required English Copy Examples

```json
{
  "brand": {
    "name": "OathFi",
    "subtitle": "HTX Ecosystem AI Trading Research & Risk Agent"
  },
  "navigation": {
    "commandCenter": "Command Center",
    "marketMonitor": "Market Monitor",
    "agentLab": "Agent Lab",
    "backtestStudio": "Backtest Studio",
    "riskFirewall": "Risk Firewall",
    "paperExecution": "Paper Execution",
    "auditReports": "Audit Reports",
    "htxEcosystem": "HTX Ecosystem",
    "settings": "Settings"
  },
  "workflow": {
    "marketEvent": "Market Event",
    "aiHypothesis": "AI Hypothesis",
    "backtest": "Backtest",
    "riskCheck": "Risk Check",
    "paperTrade": "Paper Trade",
    "review": "Review"
  },
  "status": {
    "htxApiConnected": "HTX API Connected",
    "agentRunning": "Agent Running",
    "riskModeGuarded": "Risk Mode Guarded",
    "demoModeOn": "Demo Mode ON",
    "paperTradingOnly": "Paper Trading Only",
    "liveTradingDisabled": "Live Trading Disabled"
  }
}
```

---

## 13. Required Chinese Copy Examples

```json
{
  "brand": {
    "name": "OathFi",
    "subtitle": "HTX 生态 AI 交易研究与风控 Agent"
  },
  "navigation": {
    "commandCenter": "控制中心",
    "marketMonitor": "市场监控",
    "agentLab": "Agent 实验室",
    "backtestStudio": "回测工作台",
    "riskFirewall": "风控防火墙",
    "paperExecution": "模拟执行",
    "auditReports": "审计报告",
    "htxEcosystem": "HTX 生态",
    "settings": "设置"
  },
  "workflow": {
    "marketEvent": "市场事件",
    "aiHypothesis": "AI 假设",
    "backtest": "回测验证",
    "riskCheck": "风控检查",
    "paperTrade": "模拟交易",
    "review": "复盘审计"
  },
  "status": {
    "htxApiConnected": "HTX API 已连接",
    "agentRunning": "Agent 运行中",
    "riskModeGuarded": "守护风控模式",
    "demoModeOn": "演示模式开启",
    "paperTradingOnly": "仅模拟交易",
    "liveTradingDisabled": "实盘交易已禁用"
  }
}
```

---

## 14. Translation Coverage Check

Before completion, Codex must check:

```text
[ ] Navigation translated
[ ] Top bar translated
[ ] Workflow stepper translated
[ ] Buttons translated
[ ] Tables translated
[ ] Status pills translated
[ ] Empty states translated
[ ] Error states translated
[ ] Loading states translated
[ ] Page titles translated
[ ] Tooltips translated
[ ] No hardcoded user-facing copy
```

---

## 15. Hardcoded Text Detection

Codex must search for obvious hardcoded text in:

```text
src/**/*.tsx
src/**/*.jsx
src/**/*.ts
src/**/*.js
```

Allowed hardcoded strings:

```text
test ids
CSS class names
route paths
technical constants
symbol names like BTC/USDT
```

Not allowed:

```text
button labels
page titles
table headers
status text
error messages
empty state text
card titles
```

---

## 16. Fallback Rules

If translation key is missing:

1. Do not show raw key to user.
2. Use a safe fallback.
3. Log missing translation in development.
4. Add missing key to both English and Chinese files.

---

## 17. i18n Acceptance Criteria

```text
[ ] English mode is fully English except symbols and brand terms
[ ] Chinese mode is fully Chinese except symbols and brand terms
[ ] No mojibake
[ ] No broken Chinese glyphs
[ ] No layout overflow caused by Chinese text
[ ] Language choice persists after refresh
[ ] All main pages translated
[ ] All visible buttons translated
[ ] No old product names appear in either language
```
