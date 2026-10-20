# 组件清单 · components.md

kit.css 的全部可用组件。**只用清单里的类组合页面**，缺组件先问"能不能用现有类拼"，
不能再去 kit.css 加（并同步更新本清单）。

## 窗口壳层

```html
<div class="desk">            <!-- 桌面壁纸（多彩渐变，演示用） -->
  <div class="win">           <!-- 16:9 窗口，圆角+长影 -->
    <header class="titlebar"> <!-- unified toolbar，磨砂 -->
      <div class="traffic"><i></i><i></i><i></i></div>  <!-- 红黄绿 -->
      <div class="titlebar__title">应用名 <span class="titlebar__sub">副题</span></div>
      <div class="titlebar__spacer"></div>
      <!-- .search / .segmented / .swatch / .btn 放这里 -->
    </header>
    <div class="win__body">
      <nav class="sidebar">…</nav>
      <main class="main"><div class="content">…</div></main>
    </div>
  </div>
</div>
```

- `.titlebar` 自带磨砂 + Electron 拖拽区；可交互子元素已声明 `no-drag`。
- `.desk` 的渐变色块**必须有一块正对窗口中心**——毛玻璃要透出颜色才看得见。

## 侧栏

```html
<nav class="sidebar">
  <div class="sidebar__heading">分组名</div>
  <div class="nav-item is-active" data-nav data-nav-page="home">
    <svg class="i"><use href="#i-table"/></svg>名称
    <span class="nav-item__count">1,284</span>
  </div>
  <div class="sidebar__gap"></div>   <!-- 组间距 -->
</nav>
```

- 选中项 = `--tint` 实心填充；计数徽标自动反白。
- 分组惯例：业务组 / 运行组 / 系统组——**设置永远独立成组**。

## 面板 / 卡片 / 玻璃

```html
<section class="panel" data-eid="panel-xxx">   <!-- 白卡：head + body / table / foot -->
  <div class="panel__head"><span class="panel__title">标题</span>
    <span class="panel__sub">副题</span><div class="spacer"></div>…</div>
  <div class="panel__body">…</div>
  <div class="panel__foot">…</div>
</section>
<div class="glass">…</div>   <!-- 玻璃卡：模糊+提饱和+上沿高光+外描边四件套 -->
```

## 按钮

```html
<button class="btn btn--primary">主要</button>   <!-- 强调色实心 -->
<button class="btn btn--secondary">次级</button> <!-- 白底发丝边 -->
<button class="btn">默认</button>
<button class="btn btn--plain">无边框</button>   <!-- 工具栏用，tint 文字 -->
<button class="btn btn--destructive">删除</button>
<button class="btn btn--icon btn--secondary"><svg/></button>
修饰：--sm 22px / --lg 34px / --block；按下 = 压暗（--ios 后缀才是缩放）
```

## 分段控件 / 开关 / 复选

```html
<div class="segmented" id="xxSeg">
  <span class="segmented__item is-on" data-xx="a">全部</span>
  <span class="segmented__item" data-xx="b">部分</span>
</div>
<span class="switch is-on"></span>   <!-- 34×20，绿色导轨 -->
<span class="checkbox is-on"></span> <span class="radio is-on"></span>
```

## 表单

```html
<div class="field">
  <span class="label">名称</span>
  <input class="input" />   <!-- .select 同款 -->
  <span class="hint">说明文字</span>
</div>
<label class="search"><svg/><input type="search" /></label>  <!-- 胶囊搜索框 -->
```

## 表格

```html
<table class="table">
  <thead><tr><th style="width:120px">列</th><th class="num">数值列</th></tr></thead>
  <tbody><tr class="is-selected"><td class="mono">SKU-1</td>
    <td><span class="badge badge--ok">已同步</span></td></tr></tbody>
</table>
```

- 无斑马纹，发丝线分区；表头 sticky + 凹陷底。
- `tr.is-selected` = tint 实心，徽标自动反白。
- 文字工具类：`.mono`（等宽）、`.dim`（次级）、`.num`（右对齐表格数字）。

## 徽标 / 列表 / 进度

```html
<span class="badge badge--ok|warn|danger|info">状态</span>
<div class="list"><div class="list__row"><div class="list__main">
  <div class="list__title">标题</div><div class="list__sub">副文</div>
</div><span class="switch"></span></div></div>
<div class="progress"><div class="progress__bar" style="width:40%"></div></div>
```

## 浮层

```html
<div class="scrim" hidden>            <!-- 记得配 .scrim[hidden]{display:none} -->
  <div class="sheet">                 <!-- 380px 弹窗，spring 弹入 -->
    <div class="sheet__head">…</div><div class="sheet__body">…</div>
    <div class="sheet__foot"><button class="btn">取消</button>
      <button class="btn btn--primary">确定</button></div>
  </div>
</div>
<div class="menu">                    <!-- 右键/下拉：磨砂+分隔线+kbd 快捷键 -->
  <div class="menu__item">…<span class="kbd">⌘R</span></div>
  <div class="menu__sep"></div><div class="menu__item is-disabled">…</div>
</div>
```

## 状态组件

```html
<div class="empty">…</div>                          <!-- 空状态：图标+标题+说明+按钮 -->
<div class="skeleton skeleton--block"></div>        <!-- 骨架屏 shimmer -->
<div class="toast-host"><div class="toast toast--warn">…</div></div>  <!-- 右下角通知 -->
```

## 其他

`.tabbar / .tab(+__count)` 下划线标签页 · `.kbd` 快捷键胶囊 · `.swatch` 强调色圆点 ·
`.stat__value / __label` 统计块 · `.stack / .row / .grid-2 / .grid-3 / .spacer /
.section-title / .divider` 布局小工具 · `.log*` 终端日志流（业务层示例）。

## 图标约定

24×24 viewBox、1.5px 描边、`currentColor`、`.i` / `.i--sm` 两种尺寸。
全部收在 `<svg class="sprite"><symbol id="i-xxx">` 里，`<use href="#i-xxx"/>` 引用。
新图标先画进 sprite，别内联散落。
