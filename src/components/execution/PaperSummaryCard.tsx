import { Activity, BadgeDollarSign, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaperAccount, PaperOrder } from "../../api/paperOrders";
import { riskValueLabel, sideLabel, statusLabel } from "../../lib/displayLabels";

type PaperSummaryCardProps = {
  paperOrder?: PaperOrder;
  account?: PaperAccount;
  accountError?: string | null;
};

function valueOrUnavailable(t: ReturnType<typeof useTranslation>["t"], value: unknown) {
  if (value === null || value === undefined || value === "") return riskValueLabel(t, "unavailable");
  return String(value);
}

function percent(t: ReturnType<typeof useTranslation>["t"], value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${value}%` : riskValueLabel(t, "unavailable");
}

export function PaperSummaryCard({ paperOrder, account, accountError }: PaperSummaryCardProps) {
  const { t } = useTranslation();
  const hypothesis = paperOrder?.hypothesis;
  const metrics = [
    {
      icon: TrendingUp,
      title: t("paperExecution.summary.strategy"),
      value: valueOrUnavailable(t, hypothesis?.strategy),
      meta: `${t("paperExecution.summary.direction")}: ${hypothesis?.direction ? sideLabel(t, hypothesis.direction) : riskValueLabel(t, "unavailable")}`,
    },
    {
      icon: Activity,
      title: t("paperExecution.summary.modelConfidence"),
      value: percent(t, hypothesis?.model_confidence),
      meta: `${t("paperExecution.summary.setupQuality")}: ${valueOrUnavailable(t, hypothesis?.setup_quality)}`,
    },
    {
      icon: Clock,
      title: t("paperExecution.summary.timeHorizon"),
      value: valueOrUnavailable(t, hypothesis?.time_horizon),
      meta: `${t("paperExecution.summary.market")}: ${valueOrUnavailable(t, hypothesis?.market ?? paperOrder?.symbol)}`,
    },
    {
      icon: BadgeDollarSign,
      title: t("paperExecution.summary.paperStatus"),
      value: paperOrder?.status ? statusLabel(t, paperOrder.status) : riskValueLabel(t, "unavailable"),
      meta: `${t("paperExecution.summary.leverage")}: ${riskValueLabel(t, "unavailable")} / ${
        accountError
          ? accountError
          : account
            ? `${t("paperExecution.summary.equity")}: ${account.equity.toFixed(2)}`
            : t("paperExecution.empty.noAccount")
      }`,
    },
  ];

  return (
    <section className="paper-metrics" aria-label={t("paperExecution.sections.summary")}>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article className="paper-metric" key={metric.title}>
            <header>
              <span>
                <Icon size={15} aria-hidden="true" />
              </span>
              <h3>{metric.title}</h3>
            </header>
            <strong>{metric.value}</strong>
            <p>{metric.meta}</p>
          </article>
        );
      })}
    </section>
  );
}
