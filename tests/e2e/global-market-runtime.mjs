/* global window */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
try {
  await page.goto(`${baseURL}/command-center`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__OATHFI_MARKET__?.getState().runtimeStartedAt, null, { timeout: 30000 });
  const first = await page.evaluate(() => {
    const state = window.__OATHFI_MARKET__.getState();
    return { updates: state.storeUpdateCount, startedAt: state.runtimeStartedAt, lastUpdated: state.lastUpdated };
  });
  await page.locator('a[href="/agent-lab"]').click();
  await page.waitForURL(/\/agent-lab$/, { timeout: 15000 });
  await page.waitForTimeout(2500);
  const second = await page.evaluate(() => {
    const state = window.__OATHFI_MARKET__.getState();
    return { updates: state.storeUpdateCount, startedAt: state.runtimeStartedAt, lastUpdated: state.lastUpdated };
  });
  await page.locator('a[href="/risk-firewall"]').click();
  await page.waitForURL(/\/risk-firewall$/, { timeout: 15000 });
  await page.waitForTimeout(2500);
  const third = await page.evaluate(() => {
    const state = window.__OATHFI_MARKET__.getState();
    return { updates: state.storeUpdateCount, startedAt: state.runtimeStartedAt, lastUpdated: state.lastUpdated };
  });
  await page.locator('a[href="/market"]').click();
  await page.waitForURL(/\/market$/, { timeout: 15000 });
  await page.waitForSelector(".market-monitor", { timeout: 15000 });
  if (first.startedAt !== second.startedAt || second.startedAt !== third.startedAt) {
    throw new Error(`market runtime remounted across routes: ${JSON.stringify({ first, second, third })}`);
  }
  if (!(second.updates >= first.updates && third.updates >= second.updates)) {
    throw new Error(`market runtime update counter reset across routes: ${JSON.stringify({ first, second, third })}`);
  }
  console.log(JSON.stringify({ ok: true, first, second, third }));
} finally {
  await browser.close();
}
