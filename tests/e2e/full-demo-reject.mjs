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

const settings = await api("/api/settings");
const updated = await api("/api/settings", {
  method: "PUT",
  body: JSON.stringify({ ...settings, demo_scenario: "reject", live_trading_enabled: false, real_trading_enabled: false }),
});
if (updated.demo_scenario !== "reject" || updated.live_trading_enabled || updated.real_trading_enabled) {
  throw new Error("REJECT scenario did not save with live trading disabled");
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

const entry = Number(agent.context?.current_price || 100);
const risk = await api("/api/risk/checks", {
  method: "POST",
  body: JSON.stringify({
    hypothesis_id: hypothesis.id,
    backtest_id: backtest.id,
    entry_price: entry,
    stop_loss: Number((entry * 0.984).toFixed(8)),
    take_profit: Number((entry * 1.028).toFixed(8)),
  }),
});
if (risk.decision !== "REJECTED") {
  throw new Error(`REJECT scenario was not rejected: ${JSON.stringify(risk)}`);
}

const order = await raw("/api/paper-orders", {
  method: "POST",
  body: JSON.stringify({
    hypothesis_id: hypothesis.id,
    backtest_id: backtest.id,
    risk_check_id: risk.id,
    symbol: hypothesis.symbol,
    side: "buy",
    order_type: "limit",
    price: risk.entry_price,
    quantity: risk.position_size || 0.01,
    stop_loss: risk.stop_loss,
    take_profit: risk.take_profit,
  }),
});
if (order.response.status !== 409 || order.json?.error?.code !== "RISK_BLOCKED") {
  throw new Error(`REJECT scenario created or accepted a paper order: ${JSON.stringify(order.json)}`);
}

const refreshed = await api(`/api/agent/hypotheses/${hypothesis.id}`);
if (refreshed.latest_paper_order_id) {
  throw new Error(`REJECT scenario wrote a paper_order_id: ${refreshed.latest_paper_order_id}`);
}

const audit = await api("/api/audit-reports", {
  method: "POST",
  body: JSON.stringify({ hypothesis_id: hypothesis.id, backtest_id: backtest.id, risk_check_id: risk.id }),
});
if (audit.workflow_id !== risk.workflow_id || audit.paper_order_id) {
  throw new Error(`audit did not record rejected workflow correctly: ${JSON.stringify(audit)}`);
}

console.log(JSON.stringify({ ok: true, scenario: updated.demo_scenario, decision: risk.decision, audit_report_id: audit.id }));
