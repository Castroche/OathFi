import { spawnSync } from "node:child_process";

const scripts = [
  "settings-credentials.mjs",
  "global-market-runtime.mjs",
  "zh-localization.mjs",
  "zh-agent-risk-localization.mjs",
  "agent-analysis-quality.mjs",
  "agent-hypothesis-history.mjs",
  "backtest-report-completeness.mjs",
  "full-demo-pass.mjs",
  "full-demo-reject.mjs",
  "paper-execution-ledger.mjs",
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [`tests/e2e/${script}`], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
