import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { WorkflowStepper } from "./WorkflowStepper";
import { BottomStatusBar } from "./BottomStatusBar";
import { ToastViewport } from "../common/ToastViewport";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-shell__body">
        <Sidebar />
        <main className="main-workspace">
          <WorkflowStepper />
          {children}
        </main>
      </div>
      <ToastViewport />
      <BottomStatusBar />
    </div>
  );
}
