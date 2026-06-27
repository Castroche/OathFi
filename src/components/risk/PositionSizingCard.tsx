import { Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RiskCheck } from "../../api/risk";

type PositionSizingCardProps = {
  riskCheck: RiskCheck;
};

function currency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function number(value: number, digits = 4) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function PositionSizingCard({ riskCheck }: PositionSizingCardProps) {
  const { t } = useTranslation();
  const entryPrice = Number.isFinite(riskCheck.entry_price) ? riskCheck.entry_price : 0;
  const stopLoss = Number.isFinite(riskCheck.stop_loss) ? riskCheck.stop_loss : entryPrice;
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const stopDistancePct = entryPrice ? stopDistance / entryPrice : 0;
  const rows = [
    { label: t("riskFirewall.position.accountEquity"), value: currency(riskCheck.account_equity ?? 0) },
    { label: t("riskFirewall.position.riskPerTrade"), value: percent(riskCheck.risk_per_trade ?? 0) },
    { label: t("riskFirewall.position.stopLossDistance"), value: `${currency(stopDistance)} / ${percent(stopDistancePct)}` },
    { label: t("riskFirewall.position.suggestedSize"), value: number(riskCheck.position_size ?? 0, 6) },
    { label: t("riskFirewall.position.leverage"), value: `${number(riskCheck.leverage ?? 0, 2)}x` },
    { label: t("riskFirewall.position.maxLoss"), value: currency(riskCheck.max_loss ?? 0) },
    { label: t("riskFirewall.position.rewardRisk"), value: `${number(riskCheck.reward_risk ?? 0, 2)}R` },
  ];

  return (
    <section className="risk-panel risk-panel--sizing" aria-labelledby="risk-sizing-title">
      <div className="risk-panel__heading">
        <span id="risk-sizing-title">
          <Calculator size={15} aria-hidden="true" />
          {t("riskFirewall.sections.positionSizing")}
        </span>
      </div>
      <div className="position-sizing-list">
        {rows.map((row) => (
          <div className="position-sizing-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
