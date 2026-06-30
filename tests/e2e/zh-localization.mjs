/* global fetch, localStorage */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";
const routes = ["/market", "/command-center", "/agent-lab", "/backtest", "/risk-firewall", "/paper-execution", "/audit-reports", "/htx-ecosystem", "/settings"];
const badPattern =
  /鐠|妞|閿|姒|濡|娑|鈧|锟|�|\?\?\?|undefined|missing:|Rule-based fallback|Price breaks|Invalidate if|Backtest Expectancy Positive|Profit Factor|Sample Size Sufficient|Max Drawdown Below Threshold|Acceptance market event|Audit seed event|Breakout Watch|Liquidity Shift|ETH\/USDT shows|hypothesis_generation|EXECUTE_PAPER_ORDER|GENERATE_AUDIT_REPORT|ready_for_backtest|\bpaper_order\b|\baudit_report\b|unavailable/i;

async function api(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(`${response.status} ${path}: ${JSON.stringify(json)}`);
  return json.data;
}

const settings = await api("/api/settings");
await api("/api/settings", {
  method: "PUT",
  body: JSON.stringify({ ...settings, language: "zh-CN", live_trading_enabled: false, real_trading_enabled: false }),
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "zh-CN" });
const page = await context.newPage();
try {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "zh-CN");
  });
  await page.goto(`${baseURL}/market`, { waitUntil: "domcontentloaded", timeout: 60000 });
  for (const [index, route] of routes.entries()) {
    if (index > 0) {
      await page.locator(`a[href="${route}"]`).click();
      await page.waitForURL(new RegExp(`${route.replace("/", "\\/")}$`), { timeout: 30000 });
    }
    await page.waitForTimeout(700);
    const text = await page.locator("body").innerText();
    if (badPattern.test(text)) {
      throw new Error(`bad localization text on ${route}: ${text.match(badPattern)?.[0]}`);
    }
  }
  console.log(JSON.stringify({ ok: true, routes: routes.length }));
} finally {
  await browser.close();
}
