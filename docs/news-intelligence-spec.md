# OathFi News & On-chain Intelligence Spec

## 1. Purpose

This document defines the requirements for adding a **News & On-chain Intelligence** module to OathFi.

The module must help OathFi understand recent market context, but it must **not** replace K-line, order book, trade flow, liquidity, volatility, and risk/reward analysis.

News and on-chain information are auxiliary signals. They are used for:

- risk warnings
- macro background
- on-chain anomaly alerts
- funding and VC context
- exchange / HTX ecosystem context
- decision score adjustment
- hard block risk events
- audit trail evidence

The module must not become a news website clone or a signal-selling feature.

## 2. Non-goals

Do not implement the following in this task:

- real trading
- account API
- private API
- API Key / Secret input for trading
- withdrawal functions
- copy-pasting full articles
- hidden scraping that violates site restrictions
- pretending mock news is live news
- using external AI API to decide scores or actions

OathFi must continue to display:

- Demo Mode ON
- Paper Trading Only
- Live Trading Disabled
- No real funds used

## 3. Module Name

English:

```text
News & On-chain Intelligence
```

Chinese:

```text
新闻与链上情报
```

Suggested UI placements:

- Command Center
- Market Monitor
- Audit Reports
- Live Decision Panel

## 4. Source Categories

The module should support the following categories.

### 4.1 Crypto / Web3 News

Examples:

- project updates
- protocol upgrades
- ecosystem partnerships
- exchange listing / delisting
- regulatory events
- hacks
- exploits
- security incidents

Possible planned sources:

- BlockBeats / 律动
- WuBlockchain / 吴说
- CoinDesk
- Cointelegraph
- The Block
- official project announcements
- exchange announcements

### 4.2 On-chain News / Alerts

Examples:

- whale transfers
- project treasury wallet movements
- exchange inflow / outflow alerts
- stablecoin abnormalities
- smart contract exploits
- bridge incidents
- large unlocks
- liquidation events

First version may use news-style on-chain alerts. Direct raw on-chain API integration can be added later.

### 4.3 Macro / International Events

Examples:

- Fed decisions
- CPI
- PPI
- nonfarm payrolls
- interest rate expectations
- US dollar index
- US Treasury yields
- wars and geopolitical shocks
- sanctions
- regulatory speeches

Possible planned sources:

- Jinshi / 金十数据
- Sina Finance / 新浪财经
- official macro data sources
- financial calendar sources

### 4.4 Funding / VC News

Examples:

- project financing
- institutional investment
- fund formation
- mergers and acquisitions
- ETF flows
- Web3 VC activities
- ecosystem funds

### 4.5 HTX Ecosystem News

Examples:

- HTX announcements
- HTX listings
- HTX ecosystem partnerships
- HTX Token related news
- trading pair updates
- deposit / withdrawal suspensions

### 4.6 Risk Events

Examples:

- hacks
- contract vulnerabilities
- stablecoin depegging
- rug pull risk
- exchange incidents
- regulatory enforcement
- project treasury abnormal movements
- large unlocks

Risk events are high-priority. They may trigger hard block decisions.

## 5. Source Adapter Architecture

Do not hardcode news logic inside UI components.

Create a source adapter layer.

Suggested files:

```text
src/services/news/newsTypes.ts
src/services/news/newsAdapters.ts
src/services/news/newsNormalizer.ts
src/services/news/newsClassifier.ts
src/services/news/newsScoring.ts
src/services/news/newsMock.ts
src/stores/newsIntelligenceStore.ts
src/components/news/NewsIntelligencePanel.tsx
src/components/news/NewsFeedList.tsx
src/components/news/NewsRiskBadge.tsx
src/components/news/NewsSourceStatus.tsx
src/components/news/NewsFilterTabs.tsx
```

If a source cannot be accessed from the browser because of CORS, API restrictions, or anti-scraping restrictions, mark it as:

```text
backend-required
```

Do not fake it as live.

## 6. Source Status

Every source and every item must expose source status.

Allowed source status values:

```text
live
mock
planned
backend-required
unavailable
error
```

Rules:

- `live`: real source successfully connected.
- `mock`: demo/mock data; must be clearly labeled.
- `planned`: planned but not implemented.
- `backend-required`: requires a backend gateway or private integration.
- `unavailable`: source temporarily unavailable.
- `error`: request or parser failed.

The UI must never show mock news as live news.

## 7. Standard News Item Schema

Every item must be normalized into this structure:

```ts
export type NewsSourceStatus =
  | 'live'
  | 'mock'
  | 'planned'
  | 'backend-required'
  | 'unavailable'
  | 'error';

export type NewsCategory =
  | 'crypto'
  | 'onchain'
  | 'macro'
  | 'funding'
  | 'htx'
  | 'risk';

export type NewsSentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

export type NormalizedNewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt: string;
  fetchedAt: string;
  category: NewsCategory;
  relatedSymbols: string[];
  relatedChains: string[];
  relatedProjects: string[];
  severity: number;        // 0-1
  sentiment: NewsSentiment;
  reliability: number;     // 0-1
  freshness: number;       // 0-1
  newsRisk: number;        // 0-1
  newsSupport: number;     // 0-1
  macroRisk: number;       // 0-1
  onChainRisk: number;     // 0-1
  hardBlock: boolean;
  hardBlockReason?: string;
  tags: string[];
  isLive: boolean;
  isMock: boolean;
  sourceStatus: NewsSourceStatus;
};
```

## 8. Deduplication

Implement basic deduplication.

Deduplication rules:

- exact URL duplicate
- same source + same publishedAt duplicate
- title similarity duplicate
- same event tags within a short time window

Do not display the same news event repeatedly from multiple adapters without grouping or de-duplication.

## 9. Time Decay

News impact must decay over time.

Use:

```text
RecencyDecay = exp(-AgeHours / HalfLifeHours)
```

Suggested half-life values:

```text
risk event: 24 hours
macro event: 12 hours
funding news: 72 hours
normal crypto news: 24 hours
on-chain alert: 6-12 hours
```

Newer events should affect the decision engine more strongly. Old events should gradually become background context.

## 10. News Risk and Support Scoring

News must not directly decide trade direction.

The news module should output:

```text
NewsRisk
NewsSupport
MacroRisk
OnChainRisk
HardBlockEvent
Warnings
RelatedSymbols
```

These outputs are consumed by the Live Decision Engine.

## 11. EventRiskMultiplier

Use the current OathFi decision formula:

```text
EventRiskMultiplier =
exp(
  -0.18 × NewsRisk
  -0.12 × OnChainRisk
  -0.08 × MacroRisk
)
×
(1 + 0.04 × NewsSupport + 0.03 × OnChainSupport)
```

Rules:

- positive news can only slightly boost confidence
- positive on-chain information can only slightly boost confidence
- negative news can meaningfully reduce confidence
- negative on-chain information can meaningfully reduce confidence
- extreme risk events can trigger hard block

## 12. Hard Block Events

The following events must be able to trigger hard block:

- project hack
- contract exploit
- exchange deposit / withdrawal suspension
- stablecoin depeg
- major regulatory enforcement
- project treasury wallet large transfer to exchange
- bridge exploit
- large unlock currently happening
- major exchange security incident
- severe market infrastructure outage

If `hardBlock = true`, the Live Decision Engine must output:

```text
BLOCK
```

or:

```text
NO_TRADE
```

No hard block event should be hidden behind a high technical score.

## 13. Classification Rules

First version can use rule-based classification.

Example risk keywords:

```text
hack
exploit
漏洞
攻击
被盗
暂停充提
depeg
脱锚
监管调查
SEC
lawsuit
清算
解锁
rug
bridge exploit
whale transfer
exchange inflow
```

Example support keywords:

```text
funding
融资
partnership
合作
ETF
approval
生态基金
mainnet
upgrade
上线
institutional
```

Do not rely on an external AI API for classification in the first version.

## 14. AI API Boundary

Default mode must not require external AI API.

Optional AI providers can be added later in Settings:

```text
None
OpenAI
DeepSeek
Claude
Custom
```

AI API can only be used for:

- natural language explanation
- news summarization
- report polishing
- multilingual explanation
- user-facing interpretation

AI API must not decide:

- Confidence
- Feasibility
- Risk
- Action
- BLOCK / ALLOW

The core decision engine must remain rule-based and auditable.

## 15. UI Requirements

Add a News & On-chain Intelligence panel.

The panel must show:

- title
- source
- time
- category
- related symbols
- risk level
- sentiment
- support / negative tendency
- hard block flag
- source status
- original link if available

Filters:

```text
All
Crypto
On-chain
Macro
Funding
HTX
Risk Events
```

Status badges:

```text
Live
Mock
Planned
Backend Required
Error
```

The UI must show clearly whether data is live, mock, planned, or backend-required.

## 16. Integration With Live Decision Engine

The Live Decision Panel must read outputs from the news module.

It must display:

- NewsRisk
- OnChainRisk
- MacroRisk
- News Warnings
- On-chain Warnings
- Hard Block Reasons

If no live news source is connected, the decision engine must default to neutral:

```text
NewsRisk = 0
NewsSupport = 0
MacroRisk = 0
OnChainRisk = 0
HardBlockEvent = false
```

The decision engine must not crash when no news source is available.

## 17. Audit Report Integration

Audit Reports should record:

- decision timestamp
- related news items
- related on-chain warnings
- NewsRisk
- OnChainRisk
- MacroRisk
- HardBlockEvent
- warnings used in the decision

If a hard block is triggered by news or on-chain warning, the audit report must show the reason.

## 18. Copyright and Compliance Boundaries

Do not copy full articles.

Allowed display:

- title
- short summary
- source
- time
- tags
- risk classification
- original link

Do not implement aggressive scraping. If a source requires an official API, login, payment, backend proxy, or permission, mark it as `backend-required` or `planned`.

## 19. Frontend-only vs Backend Roadmap

Current OathFi is frontend-only.

For the first version, implement:

- UI
- data schema
- source adapter interface
- mock/fallback data
- source status
- decision engine integration
- audit integration

Do not force all real sources in the frontend.

A later backend News Gateway may handle:

- RSS/API fetching
- CORS issues
- rate limiting
- caching
- deduplication
- scheduled fetch jobs
- source credentials
- database persistence

## 20. Suggested Mock Data Requirements

If using mock data, include at least 8-12 items covering:

- one crypto positive event
- one crypto negative event
- one on-chain whale alert
- one exchange inflow warning
- one macro event
- one funding event
- one HTX ecosystem event
- one hard block risk event

Every mock item must be labeled:

```text
sourceStatus: mock
isMock: true
```

## 21. i18n Requirements

All UI text must be added to:

```text
src/i18n/messages/en.json
src/i18n/messages/zh-CN.json
```

Do not hardcode UI text in components.

Chinese mode must not show:

```text
??????
undefined
null
```

English mode must not show missing translation keys.

## 22. Performance Requirements

News module must not degrade chart performance.

Rules:

- avoid frequent re-rendering of the full dashboard
- memoize filtered news lists
- cap visible news list length
- use pagination or virtualization if needed
- do not block K-line updates with news parsing
- do not fetch too frequently

## 23. Acceptance Criteria

The task is complete only if:

1. `docs/news-intelligence-spec.md` exists.
2. News & On-chain Intelligence UI exists.
3. At least 8-12 news/event items are displayed.
4. Each item includes source, time, category, relatedSymbols, severity, and sourceStatus.
5. Items can be filtered by Crypto / On-chain / Macro / Funding / HTX / Risk Events.
6. Mock items are clearly labeled as mock.
7. Live / planned / backend-required source states are visible.
8. News module outputs NewsRisk / NewsSupport / MacroRisk / OnChainRisk.
9. Live Decision Engine can consume news risk outputs.
10. Missing news sources default to neutral and do not crash the system.
11. At least one risk event can trigger a hard block example.
12. Audit Reports can record related news warnings.
13. Chinese and English modes do not show乱码, `??????`, `undefined`, or `null`.
14. `npm run build` passes.
15. `npm run lint` passes if configured.
16. No real trading, account API, API Key, Secret, withdrawal, or private exchange API is added.

## 24. Final Report Requirements

After implementation, update or create:

```text
FINAL_ACCEPTANCE_REPORT.md
```

Add a News Intelligence section including:

- files changed
- source adapter architecture
- live / mock / planned sources
- category coverage
- data schema
- deduplication approach
- time decay implementation
- EventRiskMultiplier integration
- hard block example
- decision engine integration
- audit report integration
- i18n result
- build/lint result
- known limitations
