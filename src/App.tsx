import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { fetchSettings } from "./api/settings";
import { PageWorkspace } from "./pages/PageWorkspace";
import { appRoutes, routeByPath } from "./lib/routes";
import { getWorkflowStepForPath } from "./lib/workflow";
import { markRender } from "./lib/perfDiagnostics";
import { useAppStore } from "./stores/appStore";
import { useLiveDecisionSync } from "./hooks/useLiveDecisionSync";

export default function App() {
  markRender("App");
  const location = useLocation();
  const { i18n } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setWorkflowStep = useAppStore((state) => state.setWorkflowStep);
  useLiveDecisionSync();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    retry: false,
  });

  useEffect(() => {
    if (settingsQuery.data?.language) {
      setLanguage(settingsQuery.data.language);
    }
  }, [settingsQuery.data?.language, setLanguage]);

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [i18n, language]);

  useEffect(() => {
    const step = getWorkflowStepForPath(location.pathname);
    setWorkflowStep(step);
  }, [location.pathname, setWorkflowStep]);

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/command-center" replace />} />
        {appRoutes.map((route) => (
          <Route
            key={route.id}
            path={route.path}
            element={<PageWorkspace route={routeByPath[route.path]} />}
          />
        ))}
        <Route path="/agent-lab/:hypothesisId" element={<PageWorkspace route={routeByPath["/agent-lab"]} />} />
        <Route path="/backtest/:backtestId" element={<PageWorkspace route={routeByPath["/backtest"]} />} />
        <Route path="/risk-firewall/:riskCheckId" element={<PageWorkspace route={routeByPath["/risk-firewall"]} />} />
        <Route path="/paper-execution/:paperOrderId" element={<PageWorkspace route={routeByPath["/paper-execution"]} />} />
        <Route path="/audit-reports/:auditReportId" element={<PageWorkspace route={routeByPath["/audit-reports"]} />} />
        <Route path="*" element={<Navigate to="/command-center" replace />} />
      </Routes>
    </AppShell>
  );
}
