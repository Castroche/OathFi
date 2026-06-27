import type { AgentHypothesis } from "../../api/agent";

type StrategyPreviewChartProps = {
  hypothesis?: AgentHypothesis | null;
};

export function StrategyPreviewChart({ hypothesis }: StrategyPreviewChartProps) {
  const confidence = hypothesis?.confidence ?? 0;
  const risk = hypothesis?.risk_score ?? 0;
  const path = "M 8 82 C 46 72, 54 48, 92 54 S 142 70, 182 38 S 234 22, 272 30";
  const triggerX = Math.max(18, Math.min(258, 28 + confidence * 2.2));
  const invalidX = Math.max(18, Math.min(258, 272 - risk * 1.8));

  return (
    <div className="strategy-preview-chart" aria-label="Strategy preview chart">
      <svg viewBox="0 0 280 110" role="img">
        <defs>
          <linearGradient id="strategyLine" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-blue)" />
            <stop offset="100%" stopColor="var(--accent-green)" />
          </linearGradient>
        </defs>
        <path className="strategy-preview-chart__grid" d="M8 28 H272 M8 56 H272 M8 84 H272" />
        <path className="strategy-preview-chart__line" d={path} />
        <line className="strategy-preview-chart__trigger" x1={triggerX} x2={triggerX} y1="16" y2="96" />
        <line className="strategy-preview-chart__invalid" x1={invalidX} x2={invalidX} y1="16" y2="96" />
        <circle className="strategy-preview-chart__dot" cx={triggerX} cy="44" r="4" />
        <circle className="strategy-preview-chart__risk" cx={invalidX} cy="74" r="4" />
      </svg>
      <div className="strategy-preview-chart__legend">
        <span>Trigger</span>
        <span>Invalidation</span>
      </div>
    </div>
  );
}
