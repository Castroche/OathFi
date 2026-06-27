import type { HTMLAttributes, ReactNode } from "react";

export type StatusPillVariant = "success" | "warning" | "info" | "danger" | "neutral";

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: StatusPillVariant;
};

export function StatusPill({ children, className, variant = "neutral", ...spanProps }: StatusPillProps) {
  const classes = ["status-pill", `status-pill--${variant}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...spanProps}>
      {children}
    </span>
  );
}
