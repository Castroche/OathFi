import { RotateCcw, Save, TestTube2, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

type SettingsActionsBarProps = {
  isSaving: boolean;
  isResetting: boolean;
  isTestingMarket: boolean;
  isTestingAI: boolean;
  onSave: () => void;
  onReset: () => void;
  onTestMarket: () => void;
  onTestAI: () => void;
};

export function SettingsActionsBar({
  isSaving,
  isResetting,
  isTestingMarket,
  isTestingAI,
  onSave,
  onReset,
  onTestMarket,
  onTestAI,
}: SettingsActionsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="settings-actions-bar" aria-label={t("settings.actionsBar")}>
      <button className="secondary-action secondary-action--muted" type="button" disabled={isResetting} onClick={onReset}>
        <RotateCcw size={14} aria-hidden="true" />
        <span>{isResetting ? t("settings.status.synced") : t("settings.actions.resetToDefaults")}</span>
      </button>
      <button className="secondary-action" type="button" disabled={isTestingMarket} onClick={onTestMarket}>
        <Radio size={14} aria-hidden="true" />
        <span>{isTestingMarket ? t("settings.status.synced") : t("settings.actions.testMarketSource")}</span>
      </button>
      <button className="secondary-action" type="button" disabled={isTestingAI} onClick={onTestAI}>
        <TestTube2 size={14} aria-hidden="true" />
        <span>{isTestingAI ? t("settings.status.synced") : t("settings.actions.testAIProvider")}</span>
      </button>
      <button className="primary-action" type="button" disabled={isSaving} onClick={onSave}>
        <Save size={14} aria-hidden="true" />
        <span>{isSaving ? t("settings.status.synced") : t("settings.actions.saveSettings")}</span>
      </button>
    </div>
  );
}
