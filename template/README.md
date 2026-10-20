# Apple 风 UI 模板 · Starter

从 apple-ui-kit 样板中抽出的可复用起点：设计令牌 + 组件层 + 毛玻璃材质系统 + 设计模式，
全部机制开箱即用，业务内容留白。

## 文件结构

```
template/
├── index.html       脚手架：壳层（标题栏/侧栏/视图切换）+ 设置页 + 占位页
├── tokens.css       设计令牌（唯一定义色值/字号/圆角/动效的地方）
├── kit.css          组件层（按钮/面板/表格/开关/弹窗/Toast…只准引用令牌）
├── design-mode.js   设计模式设备（拖改/备注 → change-manifest.json）
└── check.mjs        风格漂移检测器
```

## 快速开始

```bash
# 任意静态服务器指向本目录即可（backdrop-filter 对 file:// 也生效，但建议 http）
npx serve .   # 或 python -m http.server
```

改 `index.html` 里 `.titlebar__title` 的应用名，然后开始写你的业务页面。

## 三条铁律

1. **引用层只准 `var(--token)`**：业务 HTML/JS 里禁止字面色值、非标字号/圆角/时长。
   令牌不够用 → 先去 `tokens.css` 加令牌，再来引用。
2. **改外观只改令牌**：换主题色只动 `--tint`，换明暗只切 `<html data-theme>`。
3. **改完跑 `node check.mjs`**：退出码 0 才算合格，可直接接 CI。

## 新增一个页面（三步）

1. 侧栏加入口：`<div class="nav-item" data-nav data-nav-page="my-page">…</div>`
2. 主区加视图：`<section class="panel" data-page="my-page" hidden>…</section>`
3. JS 里 `PAGES` 数组加 `'my-page'`

URL 参数自动获得：`?page=my-page&theme=dark&tint=purple&glass=strong&only=<面板id>`

## 毛玻璃材质系统

- **模糊**：三档令牌 `--material-blur / -thin / -thick`，由 `index.html` 的
  `GLASS_PRESETS` 覆写（off / soft / normal / strong）。
- **透光度**：`--bg-window / -content / -raised / -sunken / -popover` 五个表面
  由 JS 用 `color-mix(--bg-*-solid, X%, transparent)` 现场派生。
- **注意**：覆写值只能引用 `-solid` 后缀的实底令牌，不能引用它自己
  （自定义属性循环引用会被浏览器整组判无效，全部变透明）。
- 关闭毛玻璃 = 清空全部覆写，恢复 `tokens.css` 实底，层级关系保留。

## 设计模式

右下角工具条 → 进入设计模式：

| 契约 | 写法 | 能力 |
|---|---|---|
| 可调整元素 | `data-eid="语义化唯一ID"` | 点选 / 隐藏 / 备注 |
| 容器内排序 | 容器与直接子元素都挂 `data-eid` | 拖动换位 |
| 自由移动 | 子元素加 `data-edrag="free"` | 拖到任意位置 |
| 双击改文字 | 元素加 `data-etext` | 双击编辑 |

「导出清单」生成 `change-manifest.json`（含你写的备注），交给 AI 按 `data-eid`
应用到源码。修改存 sessionStorage，刷新不丢；「重置」清空。

## 已知差距（诚实清单）

- CSS `border-radius` 画不出 Apple 的连续圆角（squircle），已用大档位圆角近似；
  要真 squircle 需 SVG path 或 CSS `paint()`。
- 窗口级毛玻璃（模糊桌面壁纸）浏览器做不到，这里用「半透明窗口底 + 桌面渐变」模拟；
  桌面应用可用 Electron `backgroundMaterial`。
- 明暗切换目前不持久化，刷新恢复默认（URL 参数可带入），需要时自行加 localStorage。
