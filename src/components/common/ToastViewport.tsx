import { useEffect } from "react";
import { CheckCircle2, Info, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { useAppStore, type ToastVariant } from "../../stores/appStore";

const toastIcons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: ShieldAlert,
  info: Info,
  warning: TriangleAlert,
};

export function ToastViewport() {
  const toasts = useAppStore((state) => state.toasts);
  const dismissToast = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => dismissToast(toast.id), 4200));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.variant];
        return (
          <div className={`toast toast--${toast.variant}`} role="status" key={toast.id}>
            <Icon size={16} aria-hidden="true" />
            <span>{toast.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
