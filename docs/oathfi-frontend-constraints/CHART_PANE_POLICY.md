# Chart Pane Policy

## Pane 类型

系统只允许三种 Pane 类型：

```ts
main
volume
sub
```

## 主图 Pane

固定 ID：

```ts
pane:main
```

只能包含：

- K线
- MA
- EMA
- BOLL
- VWAP
- SAR
- 画线工具
- 当前价格线

以下指标必须叠加在主图，不允许创建副图：

```text
MA
EMA
BOLL
VWAP
SAR
```

## 成交量 Pane

固定 ID：

```ts
pane:volume
```

只能包含：

```text
VOL
```

## 副图 Pane

以下指标才允许创建独立副图：

```text
MACD
RSI
KDJ
ATR
OBV
WR
CCI
```

每个副图指标默认一个 pane：

```ts
pane:${indicatorInstance.id}
```

## 规则

1. MA 不能创建副图。
2. EMA 不能创建副图。
3. BOLL 不能创建副图。
4. VWAP 不能创建副图。
5. SAR 不能创建副图。
6. MACD 不能重复出现两份。
7. 一个指标不能同时由 toolbar 和 chart renderer 渲染。
8. 切换时间周期时不能重新 addIndicator，只能 refreshIndicatorData。
9. 切换交易对时不能重复创建指标实例。
10. 删除副图指标后，如果 pane 为空，必须删除该 pane。
