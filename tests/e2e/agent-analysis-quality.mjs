import { readFileSync } from "node:fs";

const agentCard = readFileSync("src/components/agent/HypothesisCard.tsx", "utf8");
const reasoning = readFileSync("src/components/agent/AgentReasoningPanel.tsx", "utf8");
const builder = readFileSync("src/components/agent/StrategyRuleBuilder.tsx", "utf8");
const backtest = readFileSync("src/components/backtest/BacktestStudioContent.tsx", "utf8");
const apiTypes = readFileSync("src/api/agent.ts", "utf8");
const displayLabels = readFileSync("src/lib/displayLabels.ts", "utf8");
const zhMessages = readFileSync("src/i18n/messages/zh-CN.json", "utf8");
const agentService = readFileSync("backend/app/services/agent_service.py", "utf8");
const aiGateway = readFileSync("backend/app/services/ai_gateway.py", "utf8");

const requiredAgentFields = [
  "structured_hypothesis",
  "kline_evidence",
  "indicator_evidence",
  "orderbook_evidence",
  "volume_evidence",
  "entry_plan",
  "risk_notes",
  "why_not_opposite_direction",
  "backtest_rule",
  "provider_raw_output",
  "fallback_reason",
];

for (const field of requiredAgentFields) {
  if (!apiTypes.includes(field) || !agentCard.includes(field)) {
    throw new Error(`Agent analysis quality field is not wired into API type and card UI: ${field}`);
  }
}

for (const field of ["entry_rule", "exit_rule", "stop_rule", "take_profit_rule", "position_sizing_rule"]) {
  if (!builder.includes(field) || !backtest.includes("strategy_rule_snapshot")) {
    throw new Error(`Backtest handoff rule snapshot is incomplete: ${field}`);
  }
}

if (reasoning.includes("No provider output yet")) {
  throw new Error("Reasoning panel still hardcodes the provider-output placeholder.");
}

for (const required of [
  '"hypothesis a": "假设 A"',
  'long: "做多"',
  'no_trade: "不交易"',
  '"live trading disabled": "实盘交易已禁用"',
  '"paper trading only": "仅模拟交易"',
  '"provider output": "Provider 原始输出"',
  '"backtest rule": "回测规则"',
]) {
  if (!displayLabels.includes(required)) {
    throw new Error(`Chinese Agent main-display mapping is missing: ${required}`);
  }
}

for (const bad of ["Hypothesis A/B/C", "Live Trading Disabled", "Paper Trading Only", "Backtest rule", "Provider output"]) {
  if (zhMessages.includes(bad)) {
    throw new Error(`Chinese message bundle still exposes English Agent copy: ${bad}`);
  }
}

for (const required of ["_provider_output_sanity_error", "provider_output_invalid", "max_deviation = 0.2", "_localized_agent_output"]) {
  if (!agentService.includes(required)) {
    throw new Error(`Agent provider price sanity validation is missing: ${required}`);
  }
}

for (const required of ["Never use example/template prices", "market_snapshot.last_price", "实盘交易已禁用，仅允许模拟交易"]) {
  if (!aiGateway.includes(required)) {
    throw new Error(`Agent prompt is missing the price/risk quality guard: ${required}`);
  }
}

console.log("Agent analysis quality UI contract is wired.");
