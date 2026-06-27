import { Lock, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../common/StatusPill";
import { useAppStore } from "../../stores/appStore";
import { useMarketDataStore } from "../../stores/marketDataStore";

export function BottomStatusBar() {
  const { t } = useTranslation();
  const selectedSymbol = useAppStore((state) => state.selectedSymbol);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const latencyMs = useMarketDataStore((state) => state.latencyMs);

  return (
    <footer className="bottom-status-bar">
      <div className="bottom-status-bar__left">
        <Radio size={14} aria-hidden="true" />
        <span>{t("status.marketDataPublic")}</span>
        <strong>{selectedSymbol}</strong>
        <span>{dataSource}</span>
        <span>{latencyMs ?? 0} ms</span>
      </div>
      <div className="bottom-status-bar__right">
        <StatusPill variant="info">{t("status.paperTradingOnly")}</StatusPill>
        <StatusPill variant="danger">
          <Lock size={13} aria-hidden="true" />
          {t("status.liveTradingDisabled")}
        </StatusPill>
      </div>
    </footer>
  );
}
