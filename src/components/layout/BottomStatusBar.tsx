import { Lock, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../../api/settings";
import { StatusPill } from "../common/StatusPill";
import { useAppStore } from "../../stores/appStore";
import { useMarketDataStore } from "../../stores/marketDataStore";

export function BottomStatusBar() {
  const { t } = useTranslation();
  const selectedSymbol = useAppStore((state) => state.selectedSymbol);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const latencyMs = useMarketDataStore((state) => state.latencyMs);
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });
  const settings = settingsQuery.data;

  return (
    <footer className="bottom-status-bar">
      <div className="bottom-status-bar__left">
        <Radio size={14} aria-hidden="true" />
        <span>{t("status.marketDataPublic")}</span>
        <strong>{selectedSymbol}</strong>
        <span>{settings?.primary_data_source ?? dataSource}</span>
        <span>{latencyMs ?? 0} ms</span>
      </div>
      <div className="bottom-status-bar__right">
        <StatusPill variant={settings?.paper_trading_enabled === false ? "warning" : "info"}>
          {settings?.paper_trading_enabled === false ? t("settings.status.paperExecutionUnavailable") : t("status.paperTradingOnly")}
        </StatusPill>
        <StatusPill variant="danger">
          <Lock size={13} aria-hidden="true" />
          {t("status.liveTradingDisabled")}
        </StatusPill>
      </div>
    </footer>
  );
}
