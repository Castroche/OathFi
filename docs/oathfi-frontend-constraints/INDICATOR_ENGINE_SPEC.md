# Indicator Engine Spec

## 目标

所有指标必须由统一 Indicator Engine 管理，不能由各个按钮、组件、图表容器各自创建。

## 核心原则

```text
指标按钮 -> addIndicator -> Indicator Engine -> Pane Policy -> Chart Adapter
```

所有指标的添加、删除、清空、参数修改、数据刷新都必须走统一入口。

## 类型定义

```ts
type IndicatorPlacement = 'main' | 'volume' | 'sub';

type IndicatorKind =
  | 'MA'
  | 'EMA'
  | 'BOLL'
  | 'VWAP'
  | 'SAR'
  | 'VOL'
  | 'MACD'
  | 'RSI'
  | 'KDJ'
  | 'ATR'
  | 'OBV'
  | 'WR'
  | 'CCI';

type IndicatorInstance = {
  id: string;
  kind: IndicatorKind;
  label: string;
  placement: IndicatorPlacement;
  params: Record<string, any>;
  paneId: string;
  seriesIds: string[];
  markerIds?: string[];
  createdAt: number;
};
```

## 核心 API

必须实现：

```ts
addIndicator(kind: IndicatorKind, params?: Record<string, any>): void;

removeIndicator(instanceId: string): void;

updateIndicatorParams(instanceId: string, nextParams: Record<string, any>): void;

clearIndicators(): void;

refreshIndicatorData(candles: Candle[]): void;
```

## 唯一指标状态源

最终只允许一个指标源：

```ts
indicatorInstances: IndicatorInstance[];
```

以下状态如果存在，必须删除或合并：

```ts
selectedIndicators
activeIndicators
chartIndicators
renderedIndicators
```

## 禁止双渲染

指标只能由 Indicator Engine 渲染。禁止同时由 toolbar、tag list、chart renderer 各自渲染。

## 添加指标

点击指标按钮只能调用：

```ts
addIndicator(kind)
```

禁止在按钮组件里直接：

```ts
createPane()
addLineSeries()
setSeriesData()
```

## 删除指标

删除必须调用：

```ts
removeIndicator(instanceId)
```

删除时必须：

1. 删除该指标全部 series。
2. 删除该指标全部 marker。
3. 删除该指标 tag。
4. 如果是副图指标，且 pane 已空，删除 pane。
5. 如果是主图指标，只删 series，不删主图。
6. 如果是成交量指标，只删成交量相关 series。

## 清空指标

清空必须调用：

```ts
clearIndicators()
```

清空后不得残留任何指标线、副图、legend、series registry。

## 参数修改

修改参数必须调用：

```ts
updateIndicatorParams(instanceId, nextParams)
```

修改参数后：

1. 不新增 pane。
2. 不新增重复 series。
3. 只重新计算当前指标。
4. 更新当前指标已有 series 数据。
5. 更新 label。
6. 不影响其他指标实例。

## MA 示例

点击 MA 只添加一条 MA。

默认：

```text
MA(10)
```

用户可以改成：

```text
MA(20)
```

多条 MA 应该是多个实例：

```text
MA(10)
MA(20)
MA(60)
```

删除 `MA(20)` 不得影响 `MA(10)`、`MA(60)`。
