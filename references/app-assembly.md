# 壳层装配 · app-assembly.md

模板已内置全部机制。本文讲清楚每套机制的原理与扩展点——
**先读这篇再动手，能避免 90% 的返工。**

## 1. 视图切换（无顶栏方案）

当前页面由**侧栏 is-active 表达**，主区没有标题栏——不要加回去。
顶栏标题与侧栏高亮是同一信息的两次渲染，属于冗余。

新增页面三步：

```html
<!-- ① 侧栏入口 -->
<div class="nav-item" data-nav data-nav-page="my-page">…</div>
<!-- ② 主区视图 -->
<section class="panel" data-page="my-page" hidden>…</section>
```

```js
// ③ PAGES 数组（同时是 ?page= 参数的白名单）
const PAGES = ['home', 'page-a', 'settings', 'my-page'];
```

**关键 CSS**（缺了切换会失灵）：

```css
[data-page][hidden] { display: none !important; }
```

原因：`.grid-3` / `.btn` / `.badge` 的 author `display` 规则优先级高于 UA 的
`[hidden]{display:none}`，不补这条页面会"隐藏失败"。

页面级元素（属于某一页的统计卡等）也挂 `data-page`，随视图一起显隐；
工具栏级按钮应放进所属面板的 `panel__head`，不要做全局顶栏。

## 2. 毛玻璃材质系统

### 结构：模糊 + 表面透明度双轴

```js
const mix = (token, pct) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;
const GLASS_PRESETS = {
  off:    { blur:'none', thin:'none', thick:'none', win:'', content:'', raised:'', sunken:'', popover:'' },
  soft:   { blur:'saturate(207%) blur(16px)', …, win: mix('--bg-window-solid', 55), … },
  normal: { blur:'saturate(230%) blur(35px)', …, win: mix('--bg-window-solid', 38), … },
  strong: { blur:'saturate(253%) blur(51px)', …, win: mix('--bg-window-solid', 26), … }
};
function applyGlass() {
  const p = glassOn ? GLASS_PRESETS[glassLevel] : GLASS_PRESETS.off;
  root.style.setProperty('--material-blur', p.blur);       // 标题栏/侧栏
  root.style.setProperty('--material-blur-thin', p.thin);  // 卡片
  root.style.setProperty('--material-blur-thick', p.thick);// 浮层
  root.style.setProperty('--bg-window', p.win);            // 五个表面透明度
  root.style.setProperty('--bg-content', p.content);
  root.style.setProperty('--bg-raised', p.raised);
  root.style.setProperty('--bg-sunken', p.sunken);
  root.style.setProperty('--bg-popover', p.popover);
  …
}
```

设计要点：

- **为什么双轴**：壁纸是平滑渐变，只调 blur 半径肉眼无感；透明度才是可感知轴。
  档位必须同时动两个轴（上表数值 = 基准值增强 15% 后的档位）。
- **为什么 -solid**：color-mix 引用 `-solid` 实底令牌。引用被覆写的令牌自身 =
  自定义属性循环引用 = 整组失效全透明。
- **关闭态**：全部置空字符串，清掉覆写恢复 tokens.css 实底——"关掉模糊但保留层级"，
  等价 macOS「辅助功能 → 显示 → 透明度」。
- **组件如何跟随**：kit.css 里 `.titlebar/.sidebar` 挂 `--material-blur`，
  `.panel` 挂 `--material-blur-thin`（off 时为 none，零成本），`.glass/.sheet/.menu/.toast`
  挂 `--material-blur-thick`。业务代码永远不直接写 backdrop-filter。

## 3. 设置页标配（不许拆）

外观设置页 = 深色外观（太阳/月亮图标分段，无文字）+ 毛玻璃开关 + 三档强度 + 预览台。
预览台 = 桌面多彩渐变底 + 官方 `.glass` 卡片——因为预览卡片引用的就是
`--material-blur-thick`，设置一改全站与预览同步，无需任何额外演示代码。

明暗切换统一走 `data-theme-set` 属性，`setTheme()` 会让所有分段控件联动——
新增切换入口零成本。

## 4. 窗口 16:9 与全览

```css
.desk > .win { aspect-ratio: 16 / 9; max-height: 100%; }        /* 窗口模式 */
html[data-view='tall'] .desk > .win { aspect-ratio: auto; max-height: none; }
```

视口太矮时 `max-height` 收缩、比例让位于可用性；全览模式解除比例撑到内容高度。
**不要给窗口定死宽高**，不要在内容区外加全局顶栏。

## 5. URL 参数（模板自带，写页面时自动获得）

| 参数 | 值 |
|---|---|
| `?theme=` | light / dark |
| `?tint=` | blue / purple / pink / orange / green / gray |
| `?view=` | tall / window |
| `?page=` | PAGES 数组内的任意页 |
| `?glass=` | off / soft / normal / strong |
| `?only=` | 面板 id，只显示该面板（出图用） |

组合示例：`index.html?theme=dark&tint=purple&glass=strong&page=logs`

## 6. 侧栏分组规范

- 业务组（自由命名）放业务入口
- 运行组放执行历史 / 日志类
- **系统组单独放设置**——设置不与其他入口混放
- 图标走 sprite：`<svg class="i"><use href="#i-xxx"/></svg>`，新图标先画进 sprite
