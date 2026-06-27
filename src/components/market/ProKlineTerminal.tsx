import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Crosshair, Eye, EyeOff, Maximize2, MousePointer2, RotateCcw, Ruler, Settings, Trash2, X } from "lucide-react";
import {
  dispose,
  init,
  registerIndicator,
  type Chart,
  type KLineData,
  type Period,
} from "klinecharts";
import { HTX_TIMEFRAMES, type HtxTimeframe, type MarketKline } from "../../services/htx/htxTypes";
import { markRender } from "../../lib/perfDiagnostics";
import { useMarketDataStore } from "../../stores/marketDataStore";
import { StatusPill } from "../common/StatusPill";
import { MarketEventMarkerLayer } from "./MarketEventMarkerLayer";
import {
  INDICATOR_PARAM_SCHEMAS,
  chartParamsForIndicator,
  createIndicatorInstance,
  defaultParamsFor,
  indicatorKinds,
  makeIndicatorLabel,
  normalizeParams,
  type IndicatorInstance,
  type IndicatorKind,
  type IndicatorParamField,
  type IndicatorParams,
  type SeriesRegistryEntry,
} from "./indicatorEngine";

const periodByTimeframe: Record<HtxTimeframe, Period> = {
  "1m": { type: "minute", span: 1 },
  "5m": { type: "minute", span: 5 },
  "15m": { type: "minute", span: 15 },
  "1h": { type: "hour", span: 1 },
  "4h": { type: "hour", span: 4 },
  "1d": { type: "day", span: 1 },
};

const drawingTools = [
  { labelKey: "marketLive.drawing.trend", overlay: "segment" },
  { labelKey: "marketLive.drawing.horizontal", overlay: "horizontalStraightLine" },
  { labelKey: "marketLive.drawing.vertical", overlay: "verticalStraightLine" },
  { labelKey: "marketLive.drawing.rectangle", overlay: "rect" },
  { labelKey: "marketLive.drawing.fibonacci", overlay: "fibonacciLine" },
  { labelKey: "marketLive.drawing.text", overlay: "text" },
] as const;

let customIndicatorsRegistered = false;
const KLINE_MAIN_PANE_ID = "candle_pane";

function toChartData(kline: MarketKline): KLineData {
  return {
    timestamp: kline.timestamp,
    open: kline.open,
    high: kline.high,
    low: kline.low,
    close: kline.close,
    volume: kline.volume,
    turnover: kline.turnover,
  };
}

function asNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function sourceValue(kline: KLineData, source: string) {
  switch (source) {
    case "open":
      return kline.open;
    case "high":
      return kline.high;
    case "low":
      return kline.low;
    case "hl2":
      return (kline.high + kline.low) / 2;
    case "hlc3":
      return (kline.high + kline.low + kline.close) / 3;
    case "ohlc4":
      return (kline.open + kline.high + kline.low + kline.close) / 4;
    case "close":
    default:
      return kline.close;
  }
}

function offsetResults<T extends Record<string, number | undefined>>(rows: T[], key: keyof T, offset: number) {
  if (offset === 0) {
    return rows;
  }
  const shifted = rows.map(() => ({} as T));
  rows.forEach((row, index) => {
    const target = index + offset;
    if (target >= 0 && target < shifted.length) {
      shifted[target] = { ...shifted[target], [key]: row[key] };
    }
  });
  return shifted;
}

function sma(values: number[], index: number, period: number) {
  if (index < period - 1) {
    return undefined;
  }
  let sum = 0;
  for (let offset = index - period + 1; offset <= index; offset += 1) {
    sum += values[offset];
  }
  return sum / period;
}

function ema(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  let previous = values[0] ?? 0;
  return values.map((value, index) => {
    previous = index === 0 ? value : (value - previous) * multiplier + previous;
    return previous;
  });
}

function sameAnchor(left: KLineData | undefined, right: KLineData, anchor: string) {
  if (!left) {
    return false;
  }
  const leftDate = new Date(left.timestamp);
  const rightDate = new Date(right.timestamp);
  if (anchor === "month") {
    return leftDate.getUTCFullYear() === rightDate.getUTCFullYear() && leftDate.getUTCMonth() === rightDate.getUTCMonth();
  }
  if (anchor === "week") {
    const leftWeek = Math.floor((Date.UTC(leftDate.getUTCFullYear(), leftDate.getUTCMonth(), leftDate.getUTCDate()) / 86400000 + 4) / 7);
    const rightWeek = Math.floor((Date.UTC(rightDate.getUTCFullYear(), rightDate.getUTCMonth(), rightDate.getUTCDate()) / 86400000 + 4) / 7);
    return leftWeek === rightWeek;
  }
  return leftDate.toISOString().slice(0, 10) === rightDate.toISOString().slice(0, 10);
}

function registerCustomIndicators() {
  if (customIndicatorsRegistered) {
    return;
  }
  customIndicatorsRegistered = true;

  registerIndicator({
    name: "MA",
    shortName: "MA",
    series: "price",
    calcParams: chartParamsForIndicator("MA", defaultParamsFor("MA")),
    shouldOhlc: true,
    figures: [{ key: "ma", title: "MA: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam, sourceParam, offsetParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 10)));
      const source = asString(sourceParam, "close");
      const offset = Math.round(asNumber(offsetParam, 0));
      const values = dataList.map((kline) => sourceValue(kline, source));
      return offsetResults(values.map((_, index) => ({ ma: sma(values, index, period) })), "ma", offset);
    },
  });

  registerIndicator({
    name: "EMA",
    shortName: "EMA",
    series: "price",
    calcParams: chartParamsForIndicator("EMA", defaultParamsFor("EMA")),
    shouldOhlc: true,
    figures: [{ key: "ema", title: "EMA: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam, sourceParam, offsetParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 20)));
      const source = asString(sourceParam, "close");
      const offset = Math.round(asNumber(offsetParam, 0));
      const values = ema(dataList.map((kline) => sourceValue(kline, source)), period);
      return offsetResults(values.map((value) => ({ ema: value })), "ema", offset);
    },
  });

  registerIndicator({
    name: "BOLL",
    shortName: "BOLL",
    series: "price",
    calcParams: chartParamsForIndicator("BOLL", defaultParamsFor("BOLL")),
    shouldOhlc: true,
    figures: [
      { key: "up", title: "UP: ", type: "line" },
      { key: "mid", title: "MID: ", type: "line" },
      { key: "dn", title: "DN: ", type: "line" },
    ],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam, stdDevParam, sourceParam, basisTypeParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 20)));
      const stdDev = asNumber(stdDevParam, 2);
      const source = asString(sourceParam, "close");
      const basisType = asString(basisTypeParam, "SMA");
      const values = dataList.map((kline) => sourceValue(kline, source));
      const emaBasis = ema(values, period);
      return values.map((_, index) => {
        if (index < period - 1) {
          return {};
        }
        const mid = basisType === "EMA" ? emaBasis[index] : sma(values, index, period)!;
        const windowValues = values.slice(index - period + 1, index + 1);
        const variance = windowValues.reduce((sum, value) => sum + (value - mid) ** 2, 0) / period;
        const deviation = Math.sqrt(Math.abs(variance));
        return { up: mid + stdDev * deviation, mid, dn: mid - stdDev * deviation };
      });
    },
  });

  registerIndicator({
    name: "VWAP",
    shortName: "VWAP",
    series: "price",
    calcParams: chartParamsForIndicator("VWAP", defaultParamsFor("VWAP")),
    shouldOhlc: true,
    figures: [{ key: "vwap", title: "VWAP: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [anchorParam, sourceParam] = indicator.calcParams;
      const anchor = asString(anchorParam, "session");
      const source = asString(sourceParam, "hlc3");
      let volumeSum = 0;
      let valueSum = 0;
      return dataList.map((kline, index) => {
        if (!sameAnchor(dataList[index - 1], kline, anchor)) {
          volumeSum = 0;
          valueSum = 0;
        }
        const volume = Number(kline.volume) || 0;
        volumeSum += volume;
        valueSum += sourceValue(kline, source) * volume;
        return volumeSum > 0 ? { vwap: valueSum / volumeSum } : {};
      });
    },
  });

  registerIndicator({
    name: "SAR",
    shortName: "SAR",
    series: "price",
    calcParams: chartParamsForIndicator("SAR", defaultParamsFor("SAR")),
    shouldOhlc: true,
    figures: [{ key: "sar", title: "SAR: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [stepParam, maxParam] = indicator.calcParams;
      const step = asNumber(stepParam, 0.02);
      const maxStep = asNumber(maxParam, 0.2);
      let rising = true;
      let acceleration = step;
      let extreme = dataList[0]?.high ?? 0;
      let sar = dataList[0]?.low ?? 0;
      return dataList.map((kline, index) => {
        if (index === 0) {
          return { sar };
        }
        sar += acceleration * (extreme - sar);
        if (rising) {
          if (kline.low < sar) {
            rising = false;
            sar = extreme;
            extreme = kline.low;
            acceleration = step;
          } else if (kline.high > extreme) {
            extreme = kline.high;
            acceleration = Math.min(acceleration + step, maxStep);
          }
        } else if (kline.high > sar) {
          rising = true;
          sar = extreme;
          extreme = kline.high;
          acceleration = step;
        } else if (kline.low < extreme) {
          extreme = kline.low;
          acceleration = Math.min(acceleration + step, maxStep);
        }
        return { sar };
      });
    },
  });

  registerIndicator({
    name: "VOL",
    shortName: "VOL",
    series: "volume",
    calcParams: chartParamsForIndicator("VOL", defaultParamsFor("VOL")),
    figures: [
      { key: "volume", title: "VOL: ", type: "bar" },
      { key: "ma1", title: "MA1: ", type: "line" },
      { key: "ma2", title: "MA2: ", type: "line" },
    ],
    calc: (dataList: KLineData[], indicator) => {
      const [showMAParam, ma1Param, ma2Param] = indicator.calcParams;
      const showMA = showMAParam !== false;
      const ma1 = Math.max(1, Math.round(asNumber(ma1Param, 5)));
      const ma2 = Math.max(1, Math.round(asNumber(ma2Param, 10)));
      const volumes = dataList.map((kline) => Number(kline.volume) || 0);
      return volumes.map((volume, index) => ({
        volume,
        ma1: showMA ? sma(volumes, index, ma1) : undefined,
        ma2: showMA ? sma(volumes, index, ma2) : undefined,
      }));
    },
  });

  registerIndicator({
    name: "MACD",
    shortName: "MACD",
    calcParams: chartParamsForIndicator("MACD", defaultParamsFor("MACD")),
    figures: [
      { key: "dif", title: "DIF: ", type: "line" },
      { key: "dea", title: "DEA: ", type: "line" },
      { key: "macd", title: "MACD: ", type: "bar", baseValue: 0 },
    ],
    calc: (dataList: KLineData[], indicator) => {
      const [fastParam, slowParam, signalParam, sourceParam] = indicator.calcParams;
      const fast = Math.max(1, Math.round(asNumber(fastParam, 12)));
      const slow = Math.max(fast + 1, Math.round(asNumber(slowParam, 26)));
      const signal = Math.max(1, Math.round(asNumber(signalParam, 9)));
      const source = asString(sourceParam, "close");
      const values = dataList.map((kline) => sourceValue(kline, source));
      const fastEma = ema(values, fast);
      const slowEma = ema(values, slow);
      const difValues = fastEma.map((value, index) => value - slowEma[index]);
      const deaValues = ema(difValues, signal);
      return difValues.map((dif, index) => ({ dif, dea: deaValues[index], macd: (dif - deaValues[index]) * 2 }));
    },
  });

  registerIndicator({
    name: "RSI",
    shortName: "RSI",
    calcParams: chartParamsForIndicator("RSI", defaultParamsFor("RSI")),
    figures: [
      { key: "rsi", title: "RSI: ", type: "line" },
      { key: "overbought", title: "OB: ", type: "line" },
      { key: "oversold", title: "OS: ", type: "line" },
    ],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam, sourceParam, overboughtParam, oversoldParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 14)));
      const source = asString(sourceParam, "close");
      const overbought = asNumber(overboughtParam, 70);
      const oversold = asNumber(oversoldParam, 30);
      const values = dataList.map((kline) => sourceValue(kline, source));
      let averageGain = 0;
      let averageLoss = 0;
      return values.map((value, index) => {
        if (index === 0) {
          return { overbought, oversold };
        }
        const change = value - values[index - 1];
        const gain = Math.max(change, 0);
        const loss = Math.max(-change, 0);
        averageGain = index <= period ? averageGain + gain / period : (averageGain * (period - 1) + gain) / period;
        averageLoss = index <= period ? averageLoss + loss / period : (averageLoss * (period - 1) + loss) / period;
        const rs = averageLoss === 0 ? 100 : averageGain / averageLoss;
        return { rsi: 100 - 100 / (1 + rs), overbought, oversold };
      });
    },
  });

  registerIndicator({
    name: "KDJ",
    shortName: "KDJ",
    calcParams: chartParamsForIndicator("KDJ", defaultParamsFor("KDJ")),
    figures: [
      { key: "k", title: "K: ", type: "line" },
      { key: "d", title: "D: ", type: "line" },
      { key: "j", title: "J: ", type: "line" },
    ],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam, kSmoothingParam, dSmoothingParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 9)));
      const kSmoothing = Math.max(1, Math.round(asNumber(kSmoothingParam, 3)));
      const dSmoothing = Math.max(1, Math.round(asNumber(dSmoothingParam, 3)));
      let k = 50;
      let d = 50;
      return dataList.map((kline, index) => {
        const start = Math.max(0, index - period + 1);
        const window = dataList.slice(start, index + 1);
        const low = Math.min(...window.map((item) => item.low));
        const high = Math.max(...window.map((item) => item.high));
        const rsv = high === low ? 50 : ((kline.close - low) / (high - low)) * 100;
        k = ((kSmoothing - 1) * k + rsv) / kSmoothing;
        d = ((dSmoothing - 1) * d + k) / dSmoothing;
        return { k, d, j: 3 * k - 2 * d };
      });
    },
  });

  registerIndicator({
    name: "ATR",
    shortName: "ATR",
    calcParams: chartParamsForIndicator("ATR", defaultParamsFor("ATR")),
    figures: [{ key: "atr", title: "ATR: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 14)));
      let previousAtr = 0;
      return dataList.map((kline, index) => {
        const previousClose = index > 0 ? dataList[index - 1].close : kline.close;
        const trueRange = Math.max(kline.high - kline.low, Math.abs(kline.high - previousClose), Math.abs(kline.low - previousClose));
        previousAtr = index === 0 ? trueRange : (previousAtr * (period - 1) + trueRange) / period;
        return { atr: previousAtr };
      });
    },
  });

  registerIndicator({
    name: "OBV",
    shortName: "OBV",
    calcParams: chartParamsForIndicator("OBV", defaultParamsFor("OBV")),
    figures: [{ key: "obv", title: "OBV: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [sourceParam] = indicator.calcParams;
      const source = asString(sourceParam, "close");
      let obv = 0;
      return dataList.map((kline, index) => {
        if (index > 0) {
          const value = sourceValue(kline, source);
          const previous = sourceValue(dataList[index - 1], source);
          if (value > previous) {
            obv += Number(kline.volume) || 0;
          } else if (value < previous) {
            obv -= Number(kline.volume) || 0;
          }
        }
        return { obv };
      });
    },
  });

  registerIndicator({
    name: "WR",
    shortName: "WR",
    calcParams: chartParamsForIndicator("WR", defaultParamsFor("WR")),
    figures: [{ key: "wr", title: "WR: ", type: "line" }],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 14)));
      return dataList.map((kline, index) => {
        const start = Math.max(0, index - period + 1);
        const window = dataList.slice(start, index + 1);
        const high = Math.max(...window.map((item) => item.high));
        const low = Math.min(...window.map((item) => item.low));
        return { wr: high === low ? 0 : ((high - kline.close) / (high - low)) * -100 };
      });
    },
  });

  registerIndicator({
    name: "CCI",
    shortName: "CCI",
    calcParams: chartParamsForIndicator("CCI", defaultParamsFor("CCI")),
    figures: [
      { key: "cci", title: "CCI: ", type: "line" },
      { key: "upper", title: "+100: ", type: "line" },
      { key: "lower", title: "-100: ", type: "line" },
    ],
    calc: (dataList: KLineData[], indicator) => {
      const [periodParam, sourceParam] = indicator.calcParams;
      const period = Math.max(1, Math.round(asNumber(periodParam, 20)));
      const source = asString(sourceParam, "hlc3");
      const values = dataList.map((kline) => sourceValue(kline, source));
      return values.map((value, index) => {
        if (index < period - 1) {
          return { upper: 100, lower: -100 };
        }
        const windowValues = values.slice(index - period + 1, index + 1);
        const mean = windowValues.reduce((sum, item) => sum + item, 0) / period;
        const deviation = windowValues.reduce((sum, item) => sum + Math.abs(item - mean), 0) / period;
        return { cci: deviation === 0 ? 0 : (value - mean) / (0.015 * deviation), upper: 100, lower: -100 };
      });
    },
  });
}

function formatTimestamp(timestamp: number | null, fallback: string) {
  if (!timestamp) {
    return fallback;
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function formatIndicatorLabel(instance: IndicatorInstance) {
  return instance.label;
}

function createIndicatorValue(instance: IndicatorInstance) {
  return {
    name: instance.kind,
    shortName: instance.label,
    calcParams: chartParamsForIndicator(instance.kind, instance.params),
    visible: instance.visible,
  };
}

function renderMainOverlay(chart: Chart, instance: IndicatorInstance) {
  return chart.createIndicator(createIndicatorValue(instance), {
    isStack: true,
    pane: { id: KLINE_MAIN_PANE_ID },
  });
}

function renderVolumeIndicator(chart: Chart, instance: IndicatorInstance) {
  return chart.createIndicator(createIndicatorValue(instance), {
    pane: { id: "pane:volume", height: 72 },
  });
}

function renderSubPaneIndicator(chart: Chart, instance: IndicatorInstance) {
  return chart.createIndicator(createIndicatorValue(instance), {
    pane: { id: instance.paneId, height: 92 },
  });
}

function renderIndicator(chart: Chart, instance: IndicatorInstance) {
  if (instance.placement === "main") {
    return renderMainOverlay(chart, instance);
  }
  if (instance.placement === "volume") {
    return renderVolumeIndicator(chart, instance);
  }
  return renderSubPaneIndicator(chart, instance);
}

function cleanupMisplacedMainPane(chart: Chart, instance: IndicatorInstance) {
  if (instance.placement !== "main") {
    return;
  }
  chart.removeIndicator({ paneId: `pane:${instance.id}` });
}

function createIndicatorSeries(chart: Chart, instance: IndicatorInstance) {
  cleanupMisplacedMainPane(chart, instance);
  return renderIndicator(chart, instance);
}

export const ProKlineTerminal = memo(function ProKlineTerminal() {
  markRender("ProKlineTerminal");
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const barCallbackRef = useRef<((data: KLineData) => void) | null>(null);
  const seriesRegistryRef = useRef<Map<string, SeriesRegistryEntry>>(new Map());
  const defaultIndicatorsAppliedRef = useRef(false);
  const klines = useMarketDataStore((state) => state.klines);
  const klinesRef = useRef<KLineData[]>([]);
  const activeSymbol = useMarketDataStore((state) => state.activeSymbol);
  const activeTimeframe = useMarketDataStore((state) => state.activeTimeframe);
  const setActiveTimeframe = useMarketDataStore((state) => state.setActiveTimeframe);
  const snapshotVersion = useMarketDataStore((state) => state.snapshotVersion);
  const lastKlineUpdate = useMarketDataStore((state) => state.lastKlineUpdate);
  const recordChartUpdate = useMarketDataStore((state) => state.recordChartUpdate);
  const ticker = useMarketDataStore((state) => state.ticker);
  const connectionStatus = useMarketDataStore((state) => state.connectionStatus);
  const dataSource = useMarketDataStore((state) => state.dataSource);
  const lastUpdated = useMarketDataStore((state) => state.lastUpdated);
  const latencyMs = useMarketDataStore((state) => state.latencyMs);
  const [indicatorInstances, setIndicatorInstances] = useState<IndicatorInstance[]>([]);
  const indicatorInstancesRef = useRef<IndicatorInstance[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftParams, setDraftParams] = useState<IndicatorParams>({});
  const [crosshairEnabled, setCrosshairEnabled] = useState(true);
  const [zoomPanEnabled, setZoomPanEnabled] = useState(true);
  const [chartReady, setChartReady] = useState(false);

  klinesRef.current = klines.map(toChartData);
  indicatorInstancesRef.current = indicatorInstances;

  const activeIndicatorKinds = useMemo(() => new Set(indicatorInstances.map((instance) => instance.kind)), [indicatorInstances]);
  const editingInstance = indicatorInstances.find((instance) => instance.id === editingId) ?? null;

  const removeIndicatorSeries = useCallback((instance: IndicatorInstance) => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    instance.seriesIds.forEach((seriesId) => {
      chart.removeIndicator({ id: seriesId });
      seriesRegistryRef.current.delete(seriesId);
    });
    instance.markerIds?.forEach((markerId) => {
      chart.removeOverlay({ id: markerId });
    });
    if (instance.placement === "sub") {
      chart.removeIndicator({ paneId: instance.paneId });
    }
  }, []);

  const addIndicator = useCallback((kind: IndicatorKind, params?: Partial<IndicatorParams>) => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    const current = indicatorInstancesRef.current;
    if (kind === "MACD" && current.some((instance) => instance.kind === "MACD")) {
      return;
    }

    const baseInstance = createIndicatorInstance(kind, params);
    const seriesId = createIndicatorSeries(chart, baseInstance);
    if (!seriesId) {
      return;
    }

    const nextInstance = { ...baseInstance, seriesIds: [seriesId] };
    seriesRegistryRef.current.set(seriesId, {
      instanceId: nextInstance.id,
      kind,
      paneId: nextInstance.paneId,
    });

    const next = [...current, nextInstance];
    indicatorInstancesRef.current = next;
    setIndicatorInstances(next);
  }, []);

  useEffect(() => {
    if (!chartReady || !chartRef.current || defaultIndicatorsAppliedRef.current) {
      return;
    }
    defaultIndicatorsAppliedRef.current = true;
    addIndicator("MA", { period: 20 });
    addIndicator("MA", { period: 50 });
    addIndicator("MA", { period: 200 });
    addIndicator("VOL", { showMA: true, ma1: 20, ma2: 50 });
  }, [addIndicator, chartReady]);

  const removeIndicator = useCallback((instanceId: string) => {
    const current = indicatorInstancesRef.current;
    const target = current.find((instance) => instance.id === instanceId);
    if (!target) {
      return;
    }
    removeIndicatorSeries(target);
    if (editingId === instanceId) {
      setEditingId(null);
    }
    const next = current.filter((instance) => instance.id !== instanceId);
    indicatorInstancesRef.current = next;
    setIndicatorInstances(next);
  }, [editingId, removeIndicatorSeries]);

  const clearIndicators = useCallback(() => {
    indicatorInstancesRef.current.forEach(removeIndicatorSeries);
    seriesRegistryRef.current.clear();
    indicatorInstancesRef.current = [];
    setEditingId(null);
    setIndicatorInstances([]);
  }, [removeIndicatorSeries]);

  const toggleIndicatorVisibility = useCallback((instanceId: string) => {
    const chart = chartRef.current;
    const next = indicatorInstancesRef.current.map((instance) => {
      if (instance.id !== instanceId) {
        return instance;
      }
      const visible = !instance.visible;
      if (chart) {
        instance.seriesIds.forEach((seriesId) => {
          chart.overrideIndicator({
            id: seriesId,
            name: instance.kind,
            shortName: instance.label,
            calcParams: chartParamsForIndicator(instance.kind, instance.params),
            visible,
          });
        });
      }
      return { ...instance, visible };
    });
    indicatorInstancesRef.current = next;
    setIndicatorInstances(next);
  }, []);

  const openIndicatorSettings = useCallback((instance: IndicatorInstance) => {
    setEditingId((current) => (current === instance.id ? null : instance.id));
    setDraftParams({ ...instance.params });
  }, []);

  const updateDraftParam = useCallback((field: IndicatorParamField, value: string | boolean) => {
    setDraftParams((current) => ({
      ...current,
      [field.key]: field.type === "boolean" ? Boolean(value) : value,
    }));
  }, []);

  const updateIndicatorParams = useCallback((instanceId: string, nextParams: Partial<IndicatorParams>) => {
    const chart = chartRef.current;

    const next = indicatorInstancesRef.current.map((instance) => {
      if (instance.id !== instanceId) {
        return instance;
      }
      const sanitizedParams = normalizeParams(instance.kind, nextParams);
      const label = makeIndicatorLabel(instance.kind, sanitizedParams);
      if (chart) {
        instance.seriesIds.forEach((seriesId) => {
          chart.overrideIndicator({
            id: seriesId,
            name: instance.kind,
            shortName: label,
            calcParams: chartParamsForIndicator(instance.kind, sanitizedParams),
            visible: instance.visible,
          });
        });
      }
      return { ...instance, label, params: sanitizedParams };
    });
    indicatorInstancesRef.current = next;
    setIndicatorInstances(next);
  }, []);

  const applyIndicatorParams = useCallback(() => {
    if (!editingInstance) {
      return;
    }
    updateIndicatorParams(editingInstance.id, draftParams);
    setEditingId(null);
  }, [draftParams, editingInstance, updateIndicatorParams]);

  const resetIndicatorParams = useCallback(() => {
    if (!editingInstance) {
      return;
    }
    setDraftParams({ ...defaultParamsFor(editingInstance.kind) });
  }, [editingInstance]);

  useEffect(() => {
    registerCustomIndicators();
    if (!containerRef.current || chartRef.current) {
      return;
    }

    const chart = init(containerRef.current, {
      timezone: "Asia/Shanghai",
      styles: {
        grid: {
          horizontal: { color: "#1c222b", size: 1 },
          vertical: { color: "#141922", size: 1 },
        },
        candle: {
          bar: {
            upColor: "#00e0a4",
            downColor: "#ff4d4f",
            noChangeColor: "#9ca3af",
            upBorderColor: "#00e0a4",
            downBorderColor: "#ff4d4f",
            noChangeBorderColor: "#9ca3af",
            upWickColor: "#00e0a4",
            downWickColor: "#ff4d4f",
            noChangeWickColor: "#9ca3af",
          },
          priceMark: {
            last: {
              show: true,
              upColor: "#00e0a4",
              downColor: "#ff4d4f",
              noChangeColor: "#f7931a",
              line: { show: true, size: 1 },
              text: { show: true, color: "#f5f7fa" },
            },
          },
          tooltip: { showRule: "always", showType: "standard" },
        },
        xAxis: { axisLine: { color: "#343c4a" }, tickText: { color: "#9ca3af" } },
        yAxis: { axisLine: { color: "#343c4a" }, tickText: { color: "#9ca3af" } },
        crosshair: {
          show: true,
          horizontal: { line: { color: "#4da3ff", size: 1, style: "dashed" } },
          vertical: { line: { color: "#4da3ff", size: 1, style: "dashed" } },
        },
      },
    });

    if (!chart) {
      return;
    }

    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(klinesRef.current, { backward: false, forward: false });
      },
      subscribeBar: ({ callback }) => {
        barCallbackRef.current = callback;
      },
      unsubscribeBar: () => {
        barCallbackRef.current = null;
      },
    });
    chart.setZoomEnabled(true);
    chart.setScrollEnabled(true);
    chartRef.current = chart;
    setChartReady(true);

    const indicatorSeriesRegistry = seriesRegistryRef.current;
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      dispose(chart);
      chartRef.current = null;
      barCallbackRef.current = null;
      setChartReady(false);
      indicatorSeriesRegistry.clear();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    chart.setSymbol({
      ticker: activeSymbol,
      pricePrecision: activeSymbol === "HTX/USDT" ? 10 : activeSymbol === "BTC/USDT" ? 1 : 2,
      volumePrecision: 6,
    });
    chart.setPeriod(periodByTimeframe[activeTimeframe]);
    chart.resetData();
    window.setTimeout(() => chart.scrollToRealTime(120), 0);
  }, [activeSymbol, activeTimeframe, snapshotVersion]);

  useEffect(() => {
    if (
      !lastKlineUpdate ||
      lastKlineUpdate.symbol !== activeSymbol ||
      lastKlineUpdate.timeframe !== activeTimeframe ||
      !barCallbackRef.current
    ) {
      return;
    }
    barCallbackRef.current(toChartData(lastKlineUpdate.kline));
    recordChartUpdate(lastKlineUpdate);
  }, [activeSymbol, activeTimeframe, lastKlineUpdate, recordChartUpdate]);

  const createDrawing = useCallback((overlay: string) => {
    try {
      chartRef.current?.createOverlay(overlay);
    } catch {
      // Unsupported overlay names are ignored by design.
    }
  }, []);

  return (
    <section className="market-chart-panel" aria-labelledby="market-kline-title">
      <div className="market-panel-heading">
        <div>
          <span>{t("marketLive.chart.terminal")}</span>
          <h2 id="market-kline-title">{t("marketLive.chart.title", { symbol: activeSymbol })}</h2>
        </div>
        <div className="market-chart-panel__badges">
          <StatusPill variant="info">
            {t("marketLive.header.source")}: {dataSource}
          </StatusPill>
          <StatusPill variant={connectionStatus === "live" ? "success" : connectionStatus === "fallback" ? "warning" : "info"}>
            {t(`marketLive.status.${connectionStatus === "connecting" ? "loading" : connectionStatus}`)}
          </StatusPill>
        </div>
      </div>

      <div className="chart-controls chart-controls--dense" aria-label={t("marketLive.chart.controls")}>
        <div className="timeframe-tabs">
          {HTX_TIMEFRAMES.map((timeframe) => (
            <button
              className={timeframe === activeTimeframe ? "is-active" : undefined}
              key={timeframe}
              type="button"
              onClick={() => setActiveTimeframe(timeframe)}
            >
              {timeframe}
            </button>
          ))}
        </div>
        <div className="chart-toolbar">
          <button
            className={crosshairEnabled ? "is-active" : undefined}
            type="button"
            title={t("marketLive.chart.crosshair")}
            aria-label={t("marketLive.chart.crosshair")}
            aria-pressed={crosshairEnabled}
            onClick={() => setCrosshairEnabled((value) => !value)}
          >
            <Crosshair size={15} aria-hidden="true" />
          </button>
          <button
            className={zoomPanEnabled ? "is-active" : undefined}
            type="button"
            title={t("marketLive.chart.zoomPan")}
            aria-label={t("marketLive.chart.zoomPan")}
            aria-pressed={zoomPanEnabled}
            onClick={() => setZoomPanEnabled((value) => !value)}
          >
            <Ruler size={15} aria-hidden="true" />
          </button>
          <button type="button" title={t("marketLive.chart.scrollLatest")} aria-label={t("marketLive.chart.scrollLatest")} onClick={() => chartRef.current?.scrollToRealTime(160)}>
            <Maximize2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="chart-controls chart-controls--dense" aria-label={t("marketLive.chart.indicatorsDrawings")}>
        <div className="timeframe-tabs timeframe-tabs--wide">
          {indicatorKinds.map((kind) => (
            <button
              className={activeIndicatorKinds.has(kind) ? "is-active" : undefined}
              key={kind}
              type="button"
              onClick={() => addIndicator(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <div className="drawing-toolbar">
          {drawingTools.map((tool) => (
            <button key={tool.overlay} type="button" onClick={() => createDrawing(tool.overlay)}>
              <MousePointer2 size={13} aria-hidden="true" />
              {t(tool.labelKey)}
            </button>
          ))}
          <button type="button" onClick={() => chartRef.current?.removeOverlay()}>
            <Trash2 size={13} aria-hidden="true" />
            {t("marketLive.drawing.clear")}
          </button>
        </div>
      </div>

      <div className="indicator-manager" aria-label={t("marketLive.indicatorManager.aria")}>
        <div className="indicator-manager__header">
          <span>{t("marketLive.indicatorManager.title")}</span>
          <button
            type="button"
            title={indicatorInstances.length === 0 ? t("marketLive.indicatorManager.empty") : t("marketLive.indicatorManager.clearAll")}
            onClick={clearIndicators}
            disabled={indicatorInstances.length === 0}
          >
            <Trash2 size={13} aria-hidden="true" />
            {t("marketLive.indicatorManager.clearAll")}
          </button>
        </div>
        <div className="indicator-manager__chips">
          {indicatorInstances.length === 0 ? <span className="indicator-manager__empty">{t("marketLive.indicatorManager.empty")}</span> : null}
          {indicatorInstances.map((instance) => (
            <span className={`indicator-chip${instance.visible ? "" : " is-hidden"}`} key={instance.id}>
              <strong>{formatIndicatorLabel(instance)}</strong>
              <button
                type="button"
                title={instance.visible ? t("marketLive.indicatorManager.hide") : t("marketLive.indicatorManager.show")}
                aria-label={instance.visible ? t("marketLive.indicatorManager.hide") : t("marketLive.indicatorManager.show")}
                onClick={() => toggleIndicatorVisibility(instance.id)}
              >
                {instance.visible ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
              </button>
              <button type="button" title={t("marketLive.indicatorManager.settings")} aria-label={`${t("marketLive.indicatorManager.settings")} ${instance.kind}`} onClick={() => openIndicatorSettings(instance)}>
                <Settings size={13} aria-hidden="true" />
              </button>
              <button type="button" title={t("marketLive.indicatorManager.delete")} aria-label={`${t("marketLive.indicatorManager.delete")} ${instance.label}`} onClick={() => removeIndicator(instance.id)}>
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        {editingInstance ? (
          <div className="indicator-settings" aria-label={`${editingInstance.label} ${t("marketLive.indicatorManager.settings")}`}>
            <strong>{editingInstance.label}</strong>
            <div className="indicator-settings__fields">
              {INDICATOR_PARAM_SCHEMAS[editingInstance.kind].map((field) => {
                const value = draftParams[field.key] ?? field.defaultValue;
                if (field.type === "select") {
                  return (
                    <label key={`${editingInstance.id}-${field.key}`}>
                      <span>{t(field.labelKey)}</span>
                      <select value={String(value)} onChange={(event) => updateDraftParam(field, event.target.value)}>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {t(`marketLive.indicatorParamOptions.${option}`, { defaultValue: option })}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                if (field.type === "boolean") {
                  return (
                    <label className="indicator-settings__checkbox" key={`${editingInstance.id}-${field.key}`}>
                      <input checked={Boolean(value)} type="checkbox" onChange={(event) => updateDraftParam(field, event.target.checked)} />
                      <span>{t(field.labelKey)}</span>
                    </label>
                  );
                }
                return (
                  <label key={`${editingInstance.id}-${field.key}`}>
                    <span>{t(field.labelKey)}</span>
                    <input
                      max={field.max}
                      min={field.min}
                      step={field.step ?? (field.type === "integer" ? 1 : "any")}
                      type="number"
                      value={typeof value === "number" || typeof value === "string" ? value : ""}
                      onChange={(event) => updateDraftParam(field, event.target.value)}
                    />
                  </label>
                );
              })}
            </div>
            <div className="indicator-settings__actions">
              <button type="button" onClick={applyIndicatorParams}>
                <Check size={13} aria-hidden="true" />
                {t("marketLive.indicatorManager.save")}
              </button>
              <button type="button" onClick={resetIndicatorParams}>
                <RotateCcw size={13} aria-hidden="true" />
                {t("marketLive.indicatorManager.resetDefault")}
              </button>
              <button type="button" onClick={() => setEditingId(null)}>
                <X size={13} aria-hidden="true" />
                {t("marketLive.indicatorManager.cancel")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="kline-chart-shell">
        <MarketEventMarkerLayer />
        <div className="kline-chart-host" ref={containerRef} />
      </div>

      <div className="chart-legend" aria-label={t("marketLive.chart.dataStatus")}>
        <span>{t("marketLive.chart.ohlc")} {ticker ? `${ticker.open.toFixed(2)} / ${ticker.high.toFixed(2)} / ${ticker.low.toFixed(2)} / ${ticker.last.toFixed(2)}` : t("marketLive.status.loading")}</span>
        <span>{t("marketLive.header.source")}: {dataSource}</span>
        <span>{t("marketLive.header.updated")}: {formatTimestamp(lastUpdated, t("marketLive.status.loading"))}</span>
        <span>{t("marketLive.header.latency")}: {latencyMs ?? 0} ms</span>
      </div>
    </section>
  );
});
