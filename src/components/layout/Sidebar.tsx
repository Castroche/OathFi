import { NavLink } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { appRoutes } from "../../lib/routes";
import { useAppStore } from "../../stores/appStore";

export function Sidebar() {
  const { t } = useTranslation();
  const hypothesisId = useAppStore((state) => state.hypothesisId);

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav" aria-label={t("navigation.label")}>
        {appRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink className="sidebar-link" key={route.id} to={route.id === "agentLab" && hypothesisId ? `/agent-lab/${hypothesisId}` : route.path}>
              <Icon size={17} aria-hidden="true" />
              <span>{t(route.navKey)}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar__footer">
        <span>{t("common.version", { version: "1.0.0" })}</span>
        <span className="sidebar__operational">
          <CircleCheck size={14} aria-hidden="true" />
          {t("status.allSystemsOperational")}
        </span>
      </div>
    </aside>
  );
}
