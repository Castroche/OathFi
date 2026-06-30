/* global fetch */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

function runSeed() {
  const result = spawnSync("python", ["../tests/e2e/seed_paper_execution.py"], {
    cwd: path.join(root, "backend"),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`seed failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim());
}

async function api(pathname, options = {}) {
  const response = await fetch(`${baseURL}${pathname}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const json = await response.json();
  return { response, json };
}

async function ok(pathname, options = {}) {
  const { response, json } = await api(pathname, options);
  if (!response.ok || json.ok === false) {
    throw new Error(`${response.status} ${pathname}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

const ids = runSeed();

const settings = await ok("/api/settings");
await ok("/api/settings", {
  method: "PUT",
  body: JSON.stringify({
    ...settings,
    language: "en",
    demo_scenario: "pass",
    live_trading_enabled: false,
    real_trading_enabled: false,
    paper_trading_enabled: true,
    paper_execution_only: true,
  }),
});

const blockedCreate = await api("/api/paper-orders", {
  method: "POST",
  body: JSON.stringify({
    hypothesis_id: ids.conditional.hypothesis_id,
    backtest_id: ids.conditional.backtest_id,
    risk_check_id: ids.conditional.risk_check_id,
    symbol: "ETH/USDT",
    side: "buy",
    order_type: "limit",
    price: 100,
    quantity: 1,
    stop_loss: 98,
    take_profit: 104,
  }),
});
if (blockedCreate.response.status !== 409 || blockedCreate.json?.error?.code !== "RISK_BLOCKED") {
  throw new Error(`conditional risk created a paper order: ${JSON.stringify(blockedCreate.json)}`);
}

const blockedExecute = await api(`/api/paper-orders/${ids.conditional.paper_order_id}/execute`, { method: "POST", body: "{}" });
if (blockedExecute.response.status !== 409 || blockedExecute.json?.error?.code !== "RISK_BLOCKED") {
  throw new Error(`conditional risk did not block seeded legacy draft execution: ${JSON.stringify(blockedExecute.json)}`);
}

const cancelled = await ok(`/api/paper-orders/${ids.cancel.paper_order_id}/cancel`, { method: "POST", body: "{}" });
if (cancelled.status !== "cancelled") {
  throw new Error(`cancel did not update paper order: ${JSON.stringify(cancelled)}`);
}

const rejected = await api(`/api/paper-orders/${ids.rejected.paper_order_id}/execute`, { method: "POST", body: "{}" });
if (rejected.response.status !== 409 || rejected.json?.error?.code !== "RISK_BLOCKED") {
  throw new Error(`rejected risk did not block execution: ${JSON.stringify(rejected.json)}`);
}

console.log(JSON.stringify({ ok: true, ids }, null, 2));
