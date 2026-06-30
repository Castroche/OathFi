/* global fetch, localStorage */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

async function api(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(`${response.status} ${path}: ${JSON.stringify(json)}`);
  return json.data;
}

const settings = await api("/api/settings");
const updated = await api("/api/settings", {
  method: "PUT",
  body: JSON.stringify({ ...settings, language: "zh-CN", demo_scenario: "reject", live_trading_enabled: false, real_trading_enabled: false }),
});
const agent = await api("/api/agent/hypotheses/generate", {
  method: "POST",
  body: JSON.stringify({ symbol: updated.default_symbol, timeframe: updated.default_timeframe, mode: "rule_based", language: "zh-CN" }),
});
const hypothesis = agent.hypotheses[0];
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
const audit = await api("/api/audit-reports", {
  method: "POST",
  body: JSON.stringify({
    hypothesis_id: hypothesis.id,
    backtest_id: backtest.id,
    risk_check_id: risk.id,
  }),
});

const badPattern =
  /Rule-based fallback|Price breaks|Invalidate if|Backtest Expectancy Positive|Profit Factor|Sample Size Sufficient|Max Drawdown Below Threshold|Acceptance market event|Audit seed event|Breakout Watch|Liquidity Shift|ETH\/USDT shows|hypothesis_generation|EXECUTE_PAPER_ORDER|GENERATE_AUDIT_REPORT|ready_for_backtest|\bpaper_order\b|\baudit_report\b|unavailable|undefined|missing:|\?\?\?\?\?/i;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "zh-CN" });
const page = await context.newPage();
try {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "zh-CN");
    localStorage.setItem("oathfi-app-state", JSON.stringify({ state: { language: "zh-CN" }, version: 0 }));
  });
  await page.goto(`${baseURL}/agent-lab/${hypothesis.id}`, { waitUntil: "commit", timeout: 60000 });
  await page.waitForSelector(".agent-lab", { timeout: 30000 });
  let text = await page.locator("body").innerText();
  if (badPattern.test(text)) throw new Error(`Agent Lab leaked English business copy: ${text.match(badPattern)?.[0]}`);

  await page.goto(`${baseURL}/risk-firewall/${risk.id}`, { waitUntil: "commit", timeout: 60000 });
  await page.waitForSelector(".risk-firewall", { timeout: 30000 });
  const rejectedDecision = /reject|block|no_trade/i.test(String(risk.decision || ""));
  await page.getByText(rejectedDecision ? /拒绝|阻断|不交易/ : /通过|有条件|预警|谨慎/).first().waitFor({ timeout: 30000 });
  text = await page.locator("body").innerText();
  if (badPattern.test(text)) throw new Error(`Risk Firewall leaked English business copy: ${text.match(badPattern)?.[0]}`);
  if (rejectedDecision && !text.includes("阻断") && !text.includes("拒绝") && !text.includes("不交易")) {
    throw new Error("Risk Firewall did not explain the rejected path in Chinese");
  }
  if (!rejectedDecision && !text.includes("通过") && !text.includes("有条件") && !text.includes("预警") && !text.includes("谨慎")) {
    throw new Error("Risk Firewall did not show the actual risk decision in Chinese");
  }

  await page.goto(`${baseURL}/paper-execution`, { waitUntil: "commit", timeout: 60000 });
  await page.waitForSelector(".paper-execution", { timeout: 30000 });
  text = await page.locator("body").innerText();
  if (badPattern.test(text)) throw new Error(`Paper Execution leaked English business copy: ${text.match(badPattern)?.[0]}`);

  await page.goto(`${baseURL}/audit-reports/${audit.id}`, { waitUntil: "commit", timeout: 60000 });
  await page.waitForSelector(".audit-reports", { timeout: 30000 });
  text = await page.locator("body").innerText();
  if (badPattern.test(text)) throw new Error(`Audit Reports leaked English business copy: ${text.match(badPattern)?.[0]}`);

  console.log(JSON.stringify({ ok: true, hypothesis_id: hypothesis.id, risk_check_id: risk.id, audit_report_id: audit.id }));
} finally {
  await browser.close();
}
