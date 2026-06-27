# OathFi Confidence & Live Decision Engine Spec

## Purpose

The Confidence and Live Decision Engine is not a standalone page and must never be labeled as AI confidence. It is a rule-based, auditable support score for a trading hypothesis.

The UI must display:

- Confidence
- Feasibility
- Risk

The score is based on K-line structure, technical indicators, order book, trade flow, liquidity, volatility, risk/reward, news risk, on-chain risk, data quality, and signal conflicts.

## Workflow Placement

The top workflow remains six steps:

1. Market Intelligence
2. Live Judgment / AI Hypothesis
3. Backtest
4. Risk Check
5. Paper Trade
6. Review

Confidence belongs to step 2. Do not add a seventh workflow step.

## UI Placement

Command Center adds a Live Decision Card with symbol, market regime, current setup, Confidence, Feasibility, Risk, Action, Next Confirmation, Top Evidence, and Blocking Reason if any.

Market Monitor adds a Live Decision Panel with LongConfidence, ShortConfidence, MarketConfidence, FinalConfidence, FeasibilityScore, RiskScore, NewsRisk, OnChainRisk, MacroRisk, DataReliabilityMultiplier, ConflictMultiplier, evidence, warnings, and hard-block reasons.

Risk Firewall reads the Decision Engine result and adds rule rows for Confidence threshold, Feasibility threshold, Risk threshold, News risk, On-chain risk, and HardBlock. If HardBlock is true, the final action must be BLOCK or NO_TRADE.

Audit Reports record Confidence, Feasibility, Risk, Action, LongConfidence, ShortConfidence, score breakdown, NewsRisk, OnChainRisk, MacroRisk, HardBlockReason, referencedNews, and referencedOnChainAlerts.

## Formula

Use weighted geometric mean, not simple addition.

```text
MarketConfidence =
100 * T^0.25 * M^0.20 * V^0.15 * L^0.15 * Q^0.10 * RR^0.15
```

Each input is normalized to 0.05 - 1.00.

```text
FinalConfidence =
clamp(
  MarketConfidence
  * EventRiskMultiplier
  * DataReliabilityMultiplier
  * ConflictMultiplier,
  0,
  100
)
```

```text
EventRiskMultiplier =
exp(-0.18 * NewsRisk - 0.12 * OnChainRisk - 0.08 * MacroRisk)
* (1 + 0.04 * NewsSupport + 0.03 * OnChainSupport)
```

```text
DataReliabilityMultiplier = 0.60 + 0.40 * DataQuality
ConflictMultiplier = 1 - 0.35 * SignalConflict
```

News and on-chain data default to neutral when unavailable.

## Long / Short Calculation

The engine must compute both LongConfidence and ShortConfidence. If the absolute difference is below 8, long/short edge is unclear and the action must be WAIT or NO_TRADE.

## Actions

Allowed actions:

- OBSERVE
- WAIT
- ALLOW_PAPER_LONG
- ALLOW_PAPER_SHORT
- REDUCE_SIZE
- BLOCK
- NO_TRADE

Resolution:

```text
if HardBlock:
  Action = BLOCK
else if RiskScore >= 80:
  Action = BLOCK
else if FeasibilityScore < 40:
  Action = WAIT or BLOCK
else if FinalConfidence >= 75 and FeasibilityScore >= 65 and RiskScore <= 45:
  Action = ALLOW_PAPER_LONG / ALLOW_PAPER_SHORT
else if FinalConfidence >= 60 and FeasibilityScore >= 50 and RiskScore <= 65:
  Action = WAIT
else:
  Action = NO_TRADE
```

## HardBlock Rules

HardBlock must override high Confidence.

HardBlock conditions include:

- R/R < 1.2
- SpreadPct > MaxSpread
- ATRPercent > MaxATR
- NewsHardBlock = true
- OnChainHardBlock = true
- LiquidityScore < MinLiquidity
- DataQuality < MinDataQuality
- stablecoin depeg
- project hack
- contract exploit
- exchange deposit or withdrawal suspension
- project treasury wallet large transfer to exchange
- large unlock happening now

## AI API Boundary

Default mode does not require external AI API. Rule-based system logic decides Confidence, Feasibility, Risk, Action, BLOCK, and ALLOW. AI APIs may later be used only for explanation, news summarization, report polishing, or multilingual interpretation.

## Safety Boundary

OathFi must remain Demo Mode ON, Paper Trading Only, Live Trading Disabled, with no account API, no private API, no API key requirement, no secret, no real order placement, and no withdrawal logic.

## Acceptance

- Command Center has Live Decision Card.
- Market Monitor has Live Decision Panel.
- Risk Firewall reads Decision Engine output.
- Audit Reports record the decision result and score breakdown.
- Confidence / Feasibility / Risk are visible.
- LongConfidence and ShortConfidence are visible.
- MarketConfidence uses weighted geometric mean.
- News and on-chain risks affect FinalConfidence through EventRiskMultiplier.
- HardBlock forces BLOCK.
- Missing news data stays neutral and does not crash.
- No external AI API is required.
- Build and lint pass when configured.
