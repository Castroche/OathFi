type DiagnosticsWindow = Window & {
  __OATHFI_PERF__?: {
    renders: Record<string, number>;
  };
};

function diagnostics() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }
  const target = window as DiagnosticsWindow;
  target.__OATHFI_PERF__ ??= { renders: {} };
  return target.__OATHFI_PERF__;
}

export function markRender(name: string) {
  const perf = diagnostics();
  if (!perf) {
    return;
  }
  perf.renders[name] = (perf.renders[name] ?? 0) + 1;
}
