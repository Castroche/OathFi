import { readFileSync } from "node:fs";

const source = readFileSync("src/components/backtest/BacktestStudioContent.tsx", "utf8");
for (const token of [
  "BacktestSummaryCards",
  "BacktestEquityCurve",
  "BacktestDrawdownCurve",
  "BacktestRuleSnapshot",
  "BacktestTradeTable",
  "BacktestAssumptions",
  "BacktestVerdictPanel",
]) {
  if (!source.includes(token)) {
    throw new Error(`missing backtest report section ${token}`);
  }
}
for (const raw of ["Backend trades", "win_rate", "profit_factor", "max_drawdown"]) {
  if (source.includes(`>${raw}<`) || source.includes(`"${raw}"`)) {
    throw new Error(`raw backend label leaked in Backtest Studio: ${raw}`);
  }
}
console.log(JSON.stringify({ ok: true }));
