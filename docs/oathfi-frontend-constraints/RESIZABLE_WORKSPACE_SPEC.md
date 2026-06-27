# Resizable Workspace Spec

## 目标

专业 K 线工作区必须支持可调节布局。

用户至少可以调整：

1. 主图区域宽度。
2. 右侧盘口/成交区域宽度。
3. 右侧盘口卡片高度。
4. 右侧最新大额成交卡片高度。
5. 下方指标面板 / 市场事件面板高度。

## 基础布局

主工作区使用左右分栏：

```text
左侧：K线图表区
右侧：盘口 + 大额成交
```

默认比例：

```text
左侧 72%
右侧 28%
```

右侧最小宽度：

```text
420px
```

右侧推荐默认宽度：

```text
520px
```

右侧最大宽度：

```text
720px
```

## CSS 要求

所有工作区容器必须有：

```css
min-width: 0;
min-height: 0;
overflow: hidden;
```

主页面：

```css
height: 100vh;
overflow: hidden;
```

## 右侧盘口卡片

盘口卡片不能太窄。

盘口列必须完整展示：

```text
价格
数量
合计
```

如果右侧宽度不足，不能压缩成不可读状态，应该允许拖宽右侧栏。

## 拖拽分割条

必须至少实现两个 splitter：

1. 图表区和右侧行情区之间的横向 splitter。
2. 右侧订单簿和成交列表之间的纵向 splitter。

## 布局持久化

允许保存布局尺寸：

```ts
localStorage.setItem('oathfi.workspace.layout', JSON.stringify(layout))
```

注意：

可以缓存布局尺寸。

不允许缓存成交数据。
