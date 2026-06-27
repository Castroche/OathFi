export const indicatorKinds = ["MA", "EMA", "BOLL", "VWAP", "SAR", "VOL", "MACD", "RSI", "KDJ", "ATR", "OBV", "WR", "CCI"] as const;

export type IndicatorKind = (typeof indicatorKinds)[number];
export type IndicatorPlacement = "main" | "volume" | "sub";
export type IndicatorParamValue = boolean | number | string;
export type IndicatorParams = Record<string, IndicatorParamValue>;

export type IndicatorParamField = {
  key: string;
  labelKey: string;
  type: "boolean" | "integer" | "number" | "select";
  defaultValue: IndicatorParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
};

export type IndicatorInstance = {
  id: string;
  kind: IndicatorKind;
  label: string;
  placement: IndicatorPlacement;
  params: IndicatorParams;
  paneId: string;
  seriesIds: string[];
  markerIds?: string[];
  createdAt: number;
  visible: boolean;
};

export type SeriesRegistryEntry = {
  instanceId: string;
  kind: IndicatorKind;
  paneId: string;
};

export const sourceOptions = ["open", "high", "low", "close", "hl2", "hlc3", "ohlc4"];

export const INDICATOR_PARAM_SCHEMAS: Record<IndicatorKind, IndicatorParamField[]> = {
  MA: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 10, min: 1, max: 1000, step: 1 },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "close", options: sourceOptions },
    { key: "offset", labelKey: "marketLive.indicatorParams.offset", type: "integer", defaultValue: 0, step: 1 },
  ],
  EMA: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 20, min: 1, max: 1000, step: 1 },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "close", options: sourceOptions },
    { key: "offset", labelKey: "marketLive.indicatorParams.offset", type: "integer", defaultValue: 0, step: 1 },
  ],
  BOLL: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 20, min: 1, max: 1000, step: 1 },
    { key: "stdDev", labelKey: "marketLive.indicatorParams.stdDev", type: "number", defaultValue: 2, min: 0.1, max: 10, step: 0.1 },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "close", options: sourceOptions },
    { key: "basisType", labelKey: "marketLive.indicatorParams.basisType", type: "select", defaultValue: "SMA", options: ["SMA", "EMA"] },
  ],
  VWAP: [
    { key: "anchor", labelKey: "marketLive.indicatorParams.anchor", type: "select", defaultValue: "session", options: ["session", "week", "month"] },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "hlc3", options: sourceOptions },
  ],
  SAR: [
    { key: "step", labelKey: "marketLive.indicatorParams.step", type: "number", defaultValue: 0.02, min: 0.001, max: 1, step: 0.01 },
    { key: "max", labelKey: "marketLive.indicatorParams.max", type: "number", defaultValue: 0.2, min: 0.001, max: 10, step: 0.01 },
  ],
  VOL: [
    { key: "showMA", labelKey: "marketLive.indicatorParams.showMA", type: "boolean", defaultValue: true },
    { key: "ma1", labelKey: "marketLive.indicatorParams.ma1", type: "integer", defaultValue: 5, min: 1, max: 1000, step: 1 },
    { key: "ma2", labelKey: "marketLive.indicatorParams.ma2", type: "integer", defaultValue: 10, min: 1, max: 1000, step: 1 },
  ],
  MACD: [
    { key: "fast", labelKey: "marketLive.indicatorParams.fast", type: "integer", defaultValue: 12, min: 1, max: 1000, step: 1 },
    { key: "slow", labelKey: "marketLive.indicatorParams.slow", type: "integer", defaultValue: 26, min: 2, max: 1000, step: 1 },
    { key: "signal", labelKey: "marketLive.indicatorParams.signal", type: "integer", defaultValue: 9, min: 1, max: 1000, step: 1 },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "close", options: sourceOptions },
  ],
  RSI: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 14, min: 1, max: 1000, step: 1 },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "close", options: sourceOptions },
    { key: "overbought", labelKey: "marketLive.indicatorParams.overbought", type: "integer", defaultValue: 70, min: 1, max: 100, step: 1 },
    { key: "oversold", labelKey: "marketLive.indicatorParams.oversold", type: "integer", defaultValue: 30, min: 0, max: 99, step: 1 },
  ],
  KDJ: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 9, min: 1, max: 1000, step: 1 },
    { key: "kSmoothing", labelKey: "marketLive.indicatorParams.kSmoothing", type: "integer", defaultValue: 3, min: 1, max: 1000, step: 1 },
    { key: "dSmoothing", labelKey: "marketLive.indicatorParams.dSmoothing", type: "integer", defaultValue: 3, min: 1, max: 1000, step: 1 },
  ],
  ATR: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 14, min: 1, max: 1000, step: 1 },
  ],
  OBV: [
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "close", options: sourceOptions },
  ],
  WR: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 14, min: 1, max: 1000, step: 1 },
  ],
  CCI: [
    { key: "period", labelKey: "marketLive.indicatorParams.period", type: "integer", defaultValue: 20, min: 1, max: 1000, step: 1 },
    { key: "source", labelKey: "marketLive.indicatorParams.source", type: "select", defaultValue: "hlc3", options: sourceOptions },
  ],
};

export function defaultParamsFor(kind: IndicatorKind): IndicatorParams {
  return Object.fromEntries(INDICATOR_PARAM_SCHEMAS[kind].map((field) => [field.key, field.defaultValue]));
}

export function getIndicatorPlacement(kind: IndicatorKind): IndicatorPlacement {
  if (kind === "MA" || kind === "EMA" || kind === "BOLL" || kind === "VWAP" || kind === "SAR") {
    return "main";
  }
  if (kind === "VOL") {
    return "volume";
  }
  return "sub";
}

export function resolvePaneId(placement: IndicatorPlacement, instanceId: string) {
  if (placement === "main") {
    return "pane:main";
  }
  if (placement === "volume") {
    return "pane:volume";
  }
  return `pane:${instanceId}`;
}

export function paneIdForInstance(placement: IndicatorPlacement, instanceId: string) {
  return resolvePaneId(placement, instanceId);
}

export function normalizeParams(kind: IndicatorKind, params?: Partial<IndicatorParams>) {
  const normalized: IndicatorParams = {};
  INDICATOR_PARAM_SCHEMAS[kind].forEach((field) => {
    const raw = params?.[field.key] ?? field.defaultValue;
    if (field.type === "boolean") {
      normalized[field.key] = raw === true || raw === "true";
      return;
    }
    if (field.type === "select") {
      const value = String(raw);
      normalized[field.key] = field.options?.includes(value) ? value : field.defaultValue;
      return;
    }
    let value = Number(raw);
    if (!Number.isFinite(value)) {
      value = Number(field.defaultValue);
    }
    if (field.type === "integer") {
      value = Math.round(value);
    }
    if (typeof field.min === "number") {
      value = Math.max(field.min, value);
    }
    if (typeof field.max === "number") {
      value = Math.min(field.max, value);
    }
    normalized[field.key] = value;
  });

  if (kind === "MACD" && Number(normalized.fast) >= Number(normalized.slow)) {
    normalized.slow = Math.min(1000, Number(normalized.fast) + 1);
  }
  if (kind === "RSI" && Number(normalized.oversold) >= Number(normalized.overbought)) {
    normalized.oversold = Math.max(0, Number(normalized.overbought) - 1);
  }

  return normalized;
}

function formatParamValue(value: IndicatorParamValue) {
  return typeof value === "number" ? Number(value.toFixed(8)).toString() : String(value);
}

export function makeIndicatorLabel(kind: IndicatorKind, params: IndicatorParams) {
  switch (kind) {
    case "MA":
    case "EMA":
      return `${kind}(${formatParamValue(params.period)})`;
    case "BOLL":
      return `BOLL(${formatParamValue(params.period)},${formatParamValue(params.stdDev)})`;
    case "VWAP":
      return `VWAP(${params.anchor})`;
    case "SAR":
      return `SAR(${formatParamValue(params.step)},${formatParamValue(params.max)})`;
    case "VOL":
      return params.showMA ? `VOL(${formatParamValue(params.ma1)},${formatParamValue(params.ma2)})` : "VOL";
    case "MACD":
      return `MACD(${formatParamValue(params.fast)},${formatParamValue(params.slow)},${formatParamValue(params.signal)})`;
    case "RSI":
      return `RSI(${formatParamValue(params.period)})`;
    case "KDJ":
      return `KDJ(${formatParamValue(params.period)},${formatParamValue(params.kSmoothing)},${formatParamValue(params.dSmoothing)})`;
    case "ATR":
      return `ATR(${formatParamValue(params.period)})`;
    case "OBV":
      return "OBV";
    case "WR":
      return `WR(${formatParamValue(params.period)})`;
    case "CCI":
      return `CCI(${formatParamValue(params.period)})`;
    default:
      return kind;
  }
}

export function chartParamsForIndicator(kind: IndicatorKind, params: IndicatorParams) {
  switch (kind) {
    case "MA":
    case "EMA":
      return [params.period, params.source, params.offset];
    case "BOLL":
      return [params.period, params.stdDev, params.source, params.basisType];
    case "VWAP":
      return [params.anchor, params.source];
    case "SAR":
      return [params.step, params.max];
    case "VOL":
      return [params.showMA, params.ma1, params.ma2];
    case "MACD":
      return [params.fast, params.slow, params.signal, params.source];
    case "RSI":
      return [params.period, params.source, params.overbought, params.oversold];
    case "KDJ":
      return [params.period, params.kSmoothing, params.dSmoothing];
    case "ATR":
      return [params.period];
    case "OBV":
      return [params.source];
    case "WR":
      return [params.period];
    case "CCI":
      return [params.period, params.source];
    default:
      return [];
  }
}

let indicatorInstanceCounter = 0;

function createInstanceId() {
  indicatorInstanceCounter += 1;
  return globalThis.crypto?.randomUUID?.() ?? `indicator-${Date.now()}-${indicatorInstanceCounter}`;
}

export function createIndicatorInstance(kind: IndicatorKind, params?: Partial<IndicatorParams>): IndicatorInstance {
  const normalizedParams = normalizeParams(kind, params);
  const id = createInstanceId();
  const placement = getIndicatorPlacement(kind);
  return {
    id,
    kind,
    label: makeIndicatorLabel(kind, normalizedParams),
    placement,
    params: normalizedParams,
    paneId: resolvePaneId(placement, id),
    seriesIds: [],
    createdAt: Date.now(),
    visible: true,
  };
}
