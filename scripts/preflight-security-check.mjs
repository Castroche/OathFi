/* global console, process */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const forbiddenTracked = [
  ".env",
  "backend/.env",
  "*.db",
  "node_modules",
  "dist",
  "output",
  "test-results",
  ".playwright-cli",
  "src/mock",
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`SECURITY_PREFLIGHT_FAILED: ${message}`);
  process.exitCode = 1;
}

const tracked = git(["ls-files"]).split(/\r?\n/).filter(Boolean);
const existingTracked = tracked.filter((file) => existsSync(file));
const forbiddenTrackedHits = existingTracked.filter((file) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized === ".env" ||
    normalized === "backend/.env" ||
    normalized.endsWith(".db") ||
    normalized.startsWith("node_modules/") ||
    normalized.startsWith("dist/") ||
    normalized.startsWith("output/") ||
    normalized.startsWith("test-results/") ||
    normalized.startsWith(".playwright-cli/") ||
    normalized.startsWith("src/mock/")
  );
});

if (forbiddenTrackedHits.length > 0) {
  fail(`tracked generated/secret files: ${forbiddenTrackedHits.join(", ")}`);
}

const sourceFiles = existingTracked.filter((file) => /\.(ts|tsx|js|mjs|py|json|md|env|ya?ml)$/i.test(file));
const secretPattern = /((^|[^A-Za-z])sk-[A-Za-z0-9_-]{16,}|api[_-]?key\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["'])/i;
const secretHits = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  if (secretPattern.test(text)) {
    secretHits.push(file);
  }
}

if (secretHits.length > 0) {
  fail(`possible plaintext API keys in source: ${secretHits.join(", ")}`);
}

const configFiles = ["backend/app/core/config.py", "src/api/settings.ts", "src/components/settings/SettingsContent.tsx"].filter((file) =>
  tracked.includes(file),
);
const realTradingEnabled = configFiles.some((file) => /real_trading_enabled\s*[:=]\s*true/i.test(readFileSync(file, "utf8")));
if (realTradingEnabled) {
  fail("REAL_TRADING_ENABLED / real_trading_enabled appears to be true in source.");
}

if (!process.exitCode) {
  console.log(`Security preflight passed. Checked ${existingTracked.length} existing tracked files; ignored ${forbiddenTracked.join(", ")}.`);
}
