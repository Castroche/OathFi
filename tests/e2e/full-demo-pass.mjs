/* global fetch */
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

async function api(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(`${response.status} ${path}: ${JSON.stringify(json)}`);
  return json.data;
}

async function raw(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await response.json();
  return { response, json };
}

function levels(price) {
  const entry = Number(price || 100);
  return {
    entry_price: entry,
    stop_loss: Number((entry * 0.984).toFixed(8)),
    take_profit: Number((entry * 1.028).toFixed(8)),
  };
}

const settings = await api("/api/settings");
const updated = await api("/api/settings", {
  method: "PUT",
  body: JSON.stringify({ ...settings, demo_scenario: "pass", live_trading_enabled: false, real_trading_enabled: false }),
});
if (updated.demo_scenario !== "pass" || updated.live_trading_enabled || updated.real_trading_enabled) {
  throw new Error("PASS scenario did not save with live trading disabled");
}

const agent = await api("/api/agent/hypotheses/generate", {
  method: "POST",
  body: JSON.stringify({ symbol: updated.default_symbol, timeframe: updated.default_timeframe, mode: "rule_based", language: "en" }),
});
const hypothesis = agent.hypotheses[0];
if (!hypothesis?.id) throw new Error("Agent did not create a hypothesis");

const end = new Date();
const start = new Date(end);
start.setMonth(start.getMonth() - 6);
const backtest = await api("/api/backtests", {
  method: "POST",
  body: JSON.stringify({
    hypothesis_id: hypothesis.id,
    symbol: hypothesis.symbol,
    timeframe: hypothesis.timeframe,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    initial_capital: 10000,
  }),
});

const risk = await api("/api/risk/checks", {
  method: "POST",
  body: JSON.stringify({ hypothesis_id: hypothesis.id, backtest_id: backtest.id, ...levels(agent.context?.current_price) }),
});
if (risk.live_trading_enabled) {
  throw new Error("PASS scenario enabled live trading");
}

const orderPayload = {
  hypothesis_id: hypothesis.id,
  backtest_id: backtest.id,
  risk_check_id: risk.id,
  symbol: hypothesis.symbol,
  side: hypothesis.direction === "short" ? "sell" : "buy",
  order_type: "limit",
  price: risk.entry_price,
  quantity: risk.position_size || 0.01,
  stop_loss: risk.stop_loss,
  take_profit: risk.take_profit,
};

if (risk.decision !== "APPROVED") {
  const productionBlocks = new Set([
    "hypothesis_tradeable",
    "executable_strategy_valid",
    "side_price_consistency",
    "backtest_verdict_pass",
    "expectancy_positive",
    "profit_factor",
    "sample_size",
    "risk_reward_minimum",
    "market_data_live",
  ]);
  if (!risk.block_reasons?.some((reason) => productionBlocks.has(reason))) {
    throw new Error(`PASS scenario rejected without a production hard block: ${JSON.stringify(risk.block_reasons)}`);
  }
  const blockedOrder = await raw("/api/paper-orders", {
    method: "POST",
    body: JSON.stringify(orderPayload),
  });
  if (blockedOrder.response.status !== 409 || blockedOrder.json?.error?.code !== "RISK_BLOCKED") {
    throw new Error(`PASS scenario rejection still allowed paper order: ${JSON.stringify(blockedOrder.json)}`);
  }
  console.log(JSON.stringify({ ok: true, scenario: updated.demo_scenario, decision: risk.decision, block_reasons: risk.block_reasons }));
  process.exit(0);
}

const order = await api("/api/paper-orders", {
  method: "POST",
  body: JSON.stringify(orderPayload),
});
if (!order.id || order.is_real_trade || order.execution_mode !== "paper") {
  throw new Error(`paper order contract failed: ${JSON.stringify(order)}`);
}

const audit = await api(`/api/audit-reports/from-paper-order/${order.id}`, { method: "POST", body: "{}" });
if (audit.workflow_id !== risk.workflow_id || audit.paper_order_id !== order.id) {
  throw new Error(`audit did not link PASS workflow: ${JSON.stringify(audit)}`);
}

console.log(JSON.stringify({ ok: true, scenario: updated.demo_scenario, decision: risk.decision, paper_order_id: order.id, audit_report_id: audit.id }));
