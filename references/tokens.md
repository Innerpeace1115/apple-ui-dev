# 令牌体系 · tokens.md

tokens.css 是**唯一定义色值 / 字号 / 圆角 / 时长 / 缓动的地方**（定义层）；
其余一切代码是引用层，只允许 `var(--token)`。`check.mjs` 机械地执行这条边界。

## check.mjs 执法原理

- 扫描引用层的：字面色值（`#hex` / `rgb(a)`）、非标 `font-size`、非标
  `border-radius`、未定义令牌引用、tokens 之外的 `cubic-bezier`。
- 字号 / 圆角 / 时长的合法值集合**从 tokens.css 自动推导**——加令牌即入白名单。
- 定义层按文件名豁免：`tokens.css`、`kit.css`（以及 `--tokens` 指定的文件）。
- 启发式：一个文件若定义 ≥3 个色值令牌，视为色板文件整份豁免。
- 退出码 0 = 合格，可直接接 CI。

## 令牌族速查

| 族 | 关键令牌 | 规则 |
|---|---|---|
| 圆角 | `--radius-xs 4 / sm 6 / md 8 / lg 10 / xl 14 / 2xl 18 / 3xl 22 / full` | 档位制，按钮 lg、卡片 xl、窗口 3xl；禁止 416px 这类自造档 |
| 间距 | `--space-1 2 … --space-10 40` | 4pt 网格 |
| 字体 | `--font-ui`（Segoe UI Variable 顶替 SF Pro）、`--font-mono` | 中文回退 PingFang SC / 微软雅黑 |
| 字号 | `--text-2xs 10 … --text-3xl 28`，**控件基准 `--text-base 13px`** | 桌面密度，不是网页的 16px |
| 字重 | `--weight-regular/medium/semibold/bold` | |
| 字距 | `--tracking-tight/normal/wide` | **大字号必须负字距**，这是苹果味第一细节 |
| 动效 | `--ease-out / in-out / spring / snappy` + `--dur-instant/fast/normal/slow`（90/150/220/320ms） | 全站只允许这 4 条曲线；`--ease-spring` 是系统动画那条"落定"手感 |
| 强调色 | `--system-blue/green/…` + `--tint` | 全站按钮 / 选中态 / 焦点环跟着 `--tint` 走 |
| 语义标签 | `--label / -2 / -3 / -4`、`--separator(-soft)`、`--fill-1…4` | 文字层级、发丝线、控件底 |
| 背景层级 | `--bg-window / -content / -raised / -sunken / -sidebar / -toolbar / -popover` | 见下节两层结构 |
| 材质 | `--material-blur / -thin / -thick`、`--material-border`（上沿高光）、`--material-edge`（外描边） | 三档 = 标准 / 薄 / 厚 |
| 阴影 | `--shadow-1/2/3`、`--shadow-window`、`--shadow-popover` | 短淡贴地，禁大黑糊 |
| 焦点 | `--focus-ring`（外发光）、`--focus-ring-inset` | macOS 是发光不是描边 |
| 控件尺寸 | `--control-h 28 / -sm 22 / -lg 34`、`--sidebar-w 216`、`--titlebar-h 52` | |
| 壁纸 | `--desk-1 … -5` | 仅桌面背景用，与语义色隔离 |

## 背景令牌的两层结构（防循环引用）

每个表面拆成两个令牌：

```css
--bg-raised-solid: #ffffff;            /* 实底真值 */
--bg-raised: var(--bg-raised-solid);   /* 组件引用这个 */
```

毛玻璃开启时 JS 把 `--bg-raised` 覆写成
`color-mix(in srgb, var(--bg-raised-solid) X%, transparent)`。

**血泪教训**：如果 color-mix 里引用令牌自身（`--bg-raised: color-mix(… var(--bg-raised) …)`），
构成自定义属性循环引用，浏览器整组判无效，所有表面直接变全透明。
永远引用 `-solid`，永远不要引用正在被覆写的那个名字。

## 深色主题规则

- 不是把浅色反相，是重新校准：系统色提亮、`--label` 换白系、阴影加深。
- 全部收在 `:root[data-theme='dark']` 一处，业务代码零感知。
- 新增令牌必须**同时给浅色和深色值**，缺一个深色下就是白的。

## 新增令牌流程

1. 问自己：它是色值/字号/圆角/时长/缓动吗？→ 必须进 tokens.css，进不了就说明它在令牌体系外，别加。
2. 命名跟随现有族前缀（`--bg-*`、`--space-*`…），深色主题补对应值。
3. 跑 `node check.mjs` 确认引用层没有因此出现漂移。
