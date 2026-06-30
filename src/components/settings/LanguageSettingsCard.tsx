import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SettingsLanguage, SettingsUpdate } from "../../api/settings";
import { SettingsStatusBadge } from "./SettingsStatusBadge";

type LanguageSettingsCardProps = {
  settings: SettingsUpdate;
  isSaving: boolean;
  onLanguageChange: (language: SettingsLanguage) => void;
};

export function LanguageSettingsCard({ settings, isSaving, onLanguageChange }: LanguageSettingsCardProps) {
  const { t } = useTranslation();

  return (
    <section className="settings-panel settings-panel--language" aria-labelledby="settings-language">
      <div className="settings-panel__heading">
        <span id="settings-language">
          <Globe2 size={15} aria-hidden="true" />
          {t("settings.sections.language")}
        </span>
        <SettingsStatusBadge variant="success">{t("settings.status.persistent")}</SettingsStatusBadge>
      </div>

      <div className="settings-language-options" aria-label={t("settings.labels.languageOptions")}>
        <button className={settings.language === "en" ? "is-active" : undefined} type="button" disabled={isSaving} onClick={() => onLanguageChange("en")}>
          <strong>English</strong>
          <span>{t("settings.language.previewEnglish")}</span>
        </button>
        <button className={settings.language === "zh-CN" ? "is-active" : undefined} type="button" disabled={isSaving} onClick={() => onLanguageChange("zh-CN")}>
          <strong>简体中文</strong>
          <span>{t("settings.language.previewChinese")}</span>
        </button>
      </div>

      <article className="settings-row">
        <div>
          <span>{t("settings.fields.persistentLanguage")}</span>
          <strong>{settings.language}</strong>
          <p>{t("settings.language.persistenceNote")}</p>
        </div>
        <SettingsStatusBadge variant={isSaving ? "info" : "success"}>{isSaving ? t("settings.status.synced") : t("settings.status.synced")}</SettingsStatusBadge>
      </article>
    </section>
  );
}
