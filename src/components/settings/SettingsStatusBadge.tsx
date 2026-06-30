import type { ReactNode } from "react";
import { StatusPill, type StatusPillVariant } from "../common/StatusPill";

type SettingsStatusBadgeProps = {
  children: ReactNode;
  variant?: StatusPillVariant;
};

export function SettingsStatusBadge({ children, variant = "neutral" }: SettingsStatusBadgeProps) {
  return <StatusPill variant={variant}>{children}</StatusPill>;
}
