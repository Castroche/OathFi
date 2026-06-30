/* global fetch */
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

async function api(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const json = await response.json();
  if (!response.ok || json.ok === false) {
    throw new Error(`${response.status} ${path}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

const secret = `sk-e2ecredential-${Date.now()}`;
const saved = await api("/api/settings/credentials/deepseek", {
  method: "PUT",
  body: JSON.stringify({ api_key: secret, base_url: "https://api.deepseek.com", model: "deepseek-v4-flash" }),
});
if (!saved.configured || !String(saved.masked_key || "").includes("****")) {
  throw new Error(`credential was not masked/configured: ${JSON.stringify(saved)}`);
}
const settings = await api("/api/settings");
if (JSON.stringify(settings).includes(secret) || JSON.stringify(settings.settings_json || {}).toLowerCase().includes("api_key")) {
  throw new Error("settings response exposed credential material");
}
const deleted = await api("/api/settings/credentials/deepseek", { method: "DELETE", body: "{}" });
if (deleted.configured) {
  throw new Error("credential delete did not clear configured status");
}
console.log(JSON.stringify({ ok: true, provider: "deepseek" }));
