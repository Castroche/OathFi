import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.OATHFI_E2E_BASE_URL || "http://127.0.0.1:5173";

const titles = {
  en: ["Data Source", "Agent Settings", "Risk Settings", "Demo Mode", "Language Settings"],
  "zh-CN": ["数据源", "Agent 设置", "风险设置", "演示模式", "语言设置"],
};

function visibleText(page) {
  return page.locator("body").innerText();
}

async function assertNoBrokenText(page) {
  const text = await visibleText(page);
  expect(text).not.toMatch(/\?{2,}/);
  expect(text).not.toMatch(/undefined/i);
  expect(text).not.toContain("missing:");
}

async function selectLanguage(page, language) {
  const response = await page.request.get(`${baseUrl}/api/settings`);
  const settings = (await response.json()).data;
  await page.request.put(`${baseUrl}/api/settings`, {
    data: {
      ...settings,
      language,
      live_trading_enabled: false,
      real_trading_enabled: false,
    },
  });
  await page.reload({ waitUntil: "networkidle" });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });

for (const language of ["zh-CN", "en"]) {
  await selectLanguage(page, language);
  for (const title of titles[language]) {
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  }
  await assertNoBrokenText(page);
}

await selectLanguage(page, "en");

const providerSelect = page.locator("label", { hasText: "Model Provider" }).locator("select");
const modelSelect = page.locator("label", { hasText: "Model Name" }).locator("select");

await providerSelect.selectOption("deepseek");
await expect(modelSelect.locator('option[value="deepseek-v4-flash"]')).toHaveCount(1);
await expect(modelSelect.locator('option[value="qwen-plus"]')).toHaveCount(0);
await expect(modelSelect.locator('option[value="gpt-4.1-mini"]')).toHaveCount(0);

await providerSelect.selectOption("openai");
await expect(modelSelect.locator('option[value="gpt-4.1-mini"]')).toHaveCount(1);
await expect(modelSelect.locator('option[value="deepseek-v4-flash"]')).toHaveCount(0);

await providerSelect.selectOption("qwen");
await expect(modelSelect.locator('option[value="qwen-plus"]')).toHaveCount(1);
await expect(modelSelect.locator('option[value="gpt-4.1-mini"]')).toHaveCount(0);

await page.getByLabel("Settings actions").getByRole("button", { name: /Save Settings/ }).click();
await expect(page.getByText(/Settings saved|Connection|Configured|Not Configured|Synced/).first()).toBeVisible({ timeout: 10000 });
await page.reload({ waitUntil: "networkidle" });
await expect(providerSelect).toHaveValue("qwen");
await expect(modelSelect).toHaveValue("qwen-plus");

await page.getByLabel("Settings actions").getByRole("button", { name: /Reset to Defaults/ }).click();
await expect(providerSelect).toHaveValue("deepseek", { timeout: 10000 });
await expect(modelSelect).toHaveValue("deepseek-v4-flash");

await page.getByRole("button", { name: /Test Market Source/ }).first().click();
await expect(page.getByText(/connected|degraded|disconnected/).first()).toBeVisible({ timeout: 15000 });

await page.getByRole("button", { name: /Test AI Provider/ }).first().click();
await expect(page.getByText(/Connection OK|Connection Failed|Not Configured|Missing API Key|Unsupported Model|Planned/).first()).toBeVisible({ timeout: 20000 });

await assertNoBrokenText(page);
console.log("SETTINGS_SMOKE_OK");
await browser.close();
