import { useTranslation } from "react-i18next";
import type { ScoreBreakdown as ScoreBreakdownType } from "../../services/decision/decisionTypes";

export function ScoreBreakdown({ breakdown }: { breakdown: ScoreBreakdownType }) {
  const { t } = useTranslation();
  const rows = [
    ["trend", breakdown.trend],
    ["momentum", breakdown.momentum],
    ["volume", breakdown.volume],
    ["liquidity", breakdown.liquidity],
    ["volatilityQuality", breakdown.volatilityQuality],
    ["riskReward", breakdown.riskReward],
  ] as const;

  return (
    <div className="score-breakdown">
      {rows.map(([key, value]) => (
        <div className="score-breakdown__row" key={key}>
          <span>{t(`decision.breakdown.${key}`)}</span>
          <strong>{value}/100</strong>
          <i style={{ width: `${value}%` }} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
