import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

function runSeed() {
  const result = spawnSync("python", ["../tests/e2e/seed_risk_contract.py"], {
    cwd: path.join(root, "backend"),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`seed failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim());
}

async function waitForText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });
}

async function assertNoBrowserProblems(problems, badResponses) {
  if (problems.length) {
    throw new Error(`browser console/page errors:\n${problems.join("\n")}`);
  }
  if (badResponses.length) {
    throw new Error(`unexpected 404/500 responses:\n${badResponses.join("\n")}`);
  }
}

const ids = runSeed();
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "msedge", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 980 } });
const page = await context.newPage();
const browserProblems = [];
const badResponses = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    browserProblems.push(message.text());
  }
});
page.on("pageerror", (error) => browserProblems.push(error.message));
page.on("response", (response) => {
  const status = response.status();
  if (status === 404 || status >= 500) {
    badResponses.push(`${status} ${response.url()}`);
  }
});

try {
  await page.goto(`/agent-lab/${ids.conditional.hypothesis_id}`, { waitUntil: "domcontentloaded" });
  if (!page.url().includes(ids.conditional.hypothesis_id)) {
    throw new Error("Agent Lab route lost hypothesis_id");
  }
  await waitForText(page, "E2E CONDITIONAL Hypothesis");

  await page.goto(`/risk-firewall/${ids.rejected.risk_check_id}`, { waitUntil: "domcontentloaded" });
  await waitForText(page, "REJECTED");
  await waitForText(page, "expectancy <= 0");
  const rejectedButtons = await page.getByRole("button", { name: /Send to Paper Execution/i }).all();
  if (!rejectedButtons.length) {
    throw new Error("Rejected risk page did not render Send to Paper Execution button");
  }
  for (const button of rejectedButtons) {
    if (!(await button.isDisabled())) {
      throw new Error("Rejected risk check allowed Send to Paper Execution");
    }
  }

  await page.goto(`/risk-firewall/${ids.conditional.risk_check_id}`, { waitUntil: "domcontentloaded" });
  await waitForText(page, "CONDITIONAL");
  await waitForText(page, "unavailable");
  await page.getByRole("button", { name: /Send to Paper Execution/i }).last().click();
  await page.waitForURL(/\/paper-execution\/[^/]+$/, { timeout: 15000 });
  const paperOrderId = page.url().split("/").pop();
  if (!paperOrderId) {
    throw new Error("Paper Execution route lost paper_order_id");
  }
  await waitForText(page, ids.conditional.risk_check_id);
  await waitForText(page, "CONDITIONAL");

  await page.getByRole("button", { name: /Return to Agent Lab/i }).click();
  await page.waitForURL(new RegExp(`/agent-lab/${ids.conditional.hypothesis_id}$`), { timeout: 15000 });

  await assertNoBrowserProblems(browserProblems, badResponses);
  console.log(JSON.stringify({ ok: true, conditional: ids.conditional, rejected: ids.rejected, paper_order_id: paperOrderId }, null, 2));
} finally {
  await browser.close();
}
