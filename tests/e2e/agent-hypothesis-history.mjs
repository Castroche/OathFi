/* global fetch */
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
  body: JSON.stringify({ ...settings, language: "en", demo_scenario: "pass", live_trading_enabled: false, real_trading_enabled: false }),
});
const agent = await api("/api/agent/hypotheses/generate", {
  method: "POST",
  body: JSON.stringify({ symbol: updated.default_symbol, timeframe: updated.default_timeframe, mode: "rule_based", language: "en" }),
});
const hypothesis = agent.hypotheses[0];
if (!hypothesis?.id) throw new Error("Agent hypothesis was not generated");

const recent = await api("/api/agent/hypotheses?limit=10");
if (!recent.some((item) => item.id === hypothesis.id)) {
  throw new Error("Recent hypotheses endpoint did not return the generated hypothesis");
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
try {
  await page.goto(`${baseURL}/agent-lab/${hypothesis.id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".agent-lab", { timeout: 30000 });
  await page.getByText(hypothesis.symbol, { exact: false }).first().waitFor({ timeout: 30000 });

  await page.locator('a[href="/risk-firewall"]').click();
  await page.waitForURL(/\/risk-firewall$/, { timeout: 30000 });
  await page.locator(`a[href="/agent-lab/${hypothesis.id}"]`).click();
  await page.waitForURL(new RegExp(`/agent-lab/${hypothesis.id}$`), { timeout: 30000 });
  await page.getByText(hypothesis.symbol, { exact: false }).first().waitFor({ timeout: 30000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForURL(new RegExp(`/agent-lab/${hypothesis.id}$`), { timeout: 30000 });
  await page.getByText("Recent Hypotheses", { exact: false }).waitFor({ timeout: 30000 });

  let backtestId = null;
  const strategySide = hypothesis.structured_hypothesis?.executable_strategy?.side ?? hypothesis.direction;
  if (["no_trade", "neutral"].includes(strategySide)) {
    await page.getByText(/No-trade hypotheses cannot enter backtest|Non-tradeable hypothesis/i).first().waitFor({ timeout: 30000 });
  } else {
    await page.locator("button:not([disabled])").filter({ hasText: /Run Backtest|Send to Backtest/i }).first().click();
    await page.waitForURL(/\/backtest\/[^/]+$/, { timeout: 60000 });
    backtestId = page.url().split("/").pop();
    if (!backtestId) throw new Error("History handoff did not create a backtest route");
  }

  console.log(JSON.stringify({ ok: true, hypothesis_id: hypothesis.id, backtest_id: backtestId }));
} finally {
  await browser.close();
}
