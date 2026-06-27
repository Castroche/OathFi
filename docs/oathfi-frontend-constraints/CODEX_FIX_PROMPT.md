# Codex Fix Prompt

把下面内容完整发给 Codex。

---

现在不要继续局部修补。当前专业 K 线工作区存在架构级问题：

1. MACD 被重复渲染成两份。
2. MA(10) 本应叠加在主图，却被错误渲染成副图。
3. 主图指标和副图指标的 Pane 分配仍然错误。
4. 右侧实时盘口卡片过窄，无法完整展示价格、数量、合计。
5. 图表区、盘口区、成交区、事件区的大小都无法拖拽调整。
6. 中文界面仍有混杂英文风险。
7. 指标参数无法自由调节。
8. 之前的局部修复没有解决根因。

请先阅读并遵守：

- AGENTS.md
- docs/INDICATOR_ENGINE_SPEC.md
- docs/CHART_PANE_POLICY.md
- docs/RESIZABLE_WORKSPACE_SPEC.md
- docs/I18N_ZH_SPEC.md
- docs/FRONTEND_ACCEPTANCE_CHECKLIST.md

## 一、彻底删除指标双渲染路径

搜索并检查：

```bash
rg -n "selectedIndicators|activeIndicators|chartIndicators|renderedIndicators|indicatorInstances|addIndicator|createPane|addLineSeries|renderIndicator|MACD|MA\(|BOLL|VWAP" frontend src app components
```

最终只允许 `indicatorInstances` 作为唯一指标状态源。

指标按钮点击时，不能直接 `createPane` 或 `addLineSeries`。

只能调用：

```ts
addIndicator(kind)
```

## 二、修复 Pane 分配

必须实现统一 `getIndicatorPlacement`：

```ts
MA, EMA, BOLL, VWAP, SAR => main
VOL => volume
MACD, RSI, KDJ, ATR, OBV, WR, CCI => sub
```

MA(10) 必须叠加在 K 线主图，不能生成 MA 副图。

MACD 只能生成一个副图，不能重复生成两个 MACD。

## 三、重做指标实例

每个指标都是独立 `IndicatorInstance`：

```ts
type IndicatorInstance = {
  id: string;
  kind: IndicatorKind;
  label: string;
  placement: 'main' | 'volume' | 'sub';
  params: Record<string, any>;
  paneId: string;
  seriesIds: string[];
  createdAt: number;
}
```

MA 不是 MA5/MA10/MA30 固定组合。

点击 MA 默认添加一条 MA(10)。

用户可以设置为 MA20、MA60。

多个 MA 是多个独立实例。

## 四、重做指标参数系统

所有指标均需支持参数配置。

### MA

- period，整数，默认 10，范围 1-1000。
- source，select，默认 close，可选 open/high/low/close/hl2/hlc3/ohlc4。
- offset，整数，默认 0。

### EMA

- period，整数，默认 20。
- source，select，默认 close。
- offset，整数，默认 0。

### BOLL

- period，整数，默认 20。
- stdDev，数字，默认 2。
- source，select，默认 close。
- basisType，select，默认 SMA，可选 SMA/EMA。

### VWAP

- anchor，select，默认 session，可选 session/week/month。
- source，select，默认 hlc3。

### SAR

- step，数字，默认 0.02。
- max，数字，默认 0.2。

### VOL

- showMA，boolean，默认 true。
- ma1，整数，默认 5。
- ma2，整数，默认 10。

### MACD

- fast，整数，默认 12。
- slow，整数，默认 26。
- signal，整数，默认 9。
- source，select，默认 close。
- 校验 fast < slow。

### RSI

- period，整数，默认 14。
- source，select，默认 close。
- overbought，整数，默认 70。
- oversold，整数，默认 30。

### KDJ

- period，整数，默认 9。
- kSmoothing，整数，默认 3。
- dSmoothing，整数，默认 3。

### ATR

- period，整数，默认 14。

### OBV

- source，select，默认 close。

### WR

- period，整数，默认 14。

### CCI

- period，整数，默认 20。
- source，select，默认 hlc3。

## 五、修复删除和清空

删除指标必须调用：

```ts
removeIndicator(instanceId)
```

必须删除该指标全部 series。

如果是副图指标，副图空了就删除 pane。

Clear all 必须删除所有指标、所有副图、所有 series registry。

## 六、修复右侧盘口布局

当前右侧盘口卡片过窄。

请重做 K 线工作区布局：

```text
左侧：图表工作区
右侧：盘口 + 最新大额成交
```

右侧默认宽度建议 520px。

右侧最小宽度 420px。

右侧最大宽度 720px。

必须支持横向拖拽调整左侧图表区和右侧盘口区宽度。

## 七、修复右侧卡片高度

右侧订单簿和最新大额成交之间必须支持纵向拖拽调整高度。

订单簿默认占右侧高度 55%。

最新大额成交默认占 45%。

## 八、布局 CSS 要求

所有外层容器必须有：

```css
min-width: 0;
min-height: 0;
overflow: hidden;
```

主页面必须是：

```css
height: 100vh;
overflow: hidden;
```

禁止成交列表或盘口列表撑开整个页面。

## 九、布局尺寸可以缓存

可以把用户拖拽后的布局尺寸保存到 localStorage。

key 使用：

```text
oathfi.workspace.layout
```

但成交数据不允许缓存。

## 十、中文化

中文环境下必须显示：

```text
专业K线终端
实时K线工作区
指标
清空全部
设置
删除
保存
取消
周期
数据源
聚合粒度
自动
订单簿
实时深度与价差
最新大额成交
暂无大额成交
```

禁止出现：

```text
Kline 终端
INDICATORS
Clear all
Precision
Auto
```

## 十一、验收

修完后逐条对 `docs/FRONTEND_ACCEPTANCE_CHECKLIST.md` 做自检，并输出：

1. 修改文件列表。
2. 删除了哪些旧的重复渲染逻辑。
3. 新的 Indicator Engine 文件位置。
4. 新的 Resizable Workspace 文件位置。
5. 逐条验收结果。
