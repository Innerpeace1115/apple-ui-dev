---
name: apple-ui-dev
description: 生成与 apple-ui-kit 同风格的 Apple / macOS 风 Web 应用（数据控制台、管理面板、工具站）。当用户要求"苹果风 / macOS 风 / 毛玻璃 / 桌面级 Web 应用"时使用。内置起始模板、设计令牌体系、组件清单、毛玻璃材质系统、设计模式契约，以及每次生成必须执行的「风格校验 → 浏览器验证 → 截图存档」质量闭环。
---

# apple-ui-dev · Apple 风 Web 应用生成器

## 目标产出

一个与 apple-ui-kit 同源的桌面级 Web 应用：

- 16:9 窗口悬浮在多彩桌面壁纸上，圆角 + 长影
- 半透明磨砂侧栏与标题栏（backdrop-filter），灰底白卡内容区
- 明暗双主题 + 六色强调色，全站由令牌驱动，一处切换全局跟随
- 三档毛玻璃材质（轻盈/标准/浓郁）+ 设置页实时预览
- 右下角设计模式工具条：拖改 / 备注可导出 change-manifest.json

## 第 0 步 · 永远从模板开始（禁止裸写）

把 `template/` 复制到目标目录，这是唯一合法的起点：

```bash
# Windows
Copy-Item -Recurse <本技能目录>/template <目标目录>
```

模板已内置全部机制：16:9 壳层、明暗主题、强调色、毛玻璃三档材质 + 设置页、
视图切换、URL 参数、设计模式、风格检测器。**禁止凭记忆重写这些机制**——
它们每一处都踩过坑（见 references/quality-loop.md 第 5 节）。

## 三条铁律（check.mjs 是执法者）

1. **引用层只准 `var(--token)`**。业务 HTML / JS 里禁止字面色值、非标字号 /
   圆角 / 时长 / 缓动。缺令牌 → 先进 `tokens.css` 定义，再回来引用。
2. **改外观只改令牌**。换主题色动 `--tint`；换明暗切 `<html data-theme>`；
   毛玻璃改 `GLASS_PRESETS`。在业务代码里零散写视觉样式 = 风格漂移。
3. **交付前 `node check.mjs` 退出码必须为 0**。它扫描字面色值、非标字号、
   非标圆角、未定义令牌、非标缓动——是这套风格的执法者，不是建议。

## 设计语言速查（细节见 references/tokens.md）

| 维度 | 规则 |
|---|---|
| 基准字号 | 13px（桌面密度），辅助 11/12/15/17px，4pt 间距网格 |
| 大字号 | 一律负字距 `--tracking-tight`，这是"苹果味"的关键细节 |
| 圆角 | 档位制 4/6/8/10/14/18/22px，按钮 10、卡片 14、窗口 22 |
| 分隔 | 1px 发丝线 `--separator-soft`，不用粗边框 |
| 阴影 | 短、淡、贴地（`--shadow-1/2/3`），禁止大黑糊 |
| 动效 | 全站只允许 4 条贝塞尔曲线（tokens.css），时长 90/150/220/320ms |
| 按下 | macOS 语义 = 压暗（`brightness(0.93)`），不是缩放；缩放是 iOS 语义 |
| 焦点 | 外发光环 `--focus-ring`，不是换边框颜色 |
| 布局 | 侧栏 216px 半透明 + 内容区"灰底白卡"分层；窗口 16:9；**无冗余顶栏** |
| 侧栏分组 | 业务组 / 运行组 / 系统组（设置永远独立成组，不与其他混放） |
| 深色模式 | 不是反色，是重新校准的整套令牌（`data-theme` 一键切换） |

## 页面装配（三步）

1. 侧栏入口：`<div class="nav-item" data-nav data-nav-page="my-page">…</div>`
2. 主区视图：`<section class="panel" data-page="my-page" hidden>…</section>`
3. JS `PAGES` 数组加 `'my-page'`

**设置页是标配**（深色外观 + 毛玻璃开关 + 三档强度 + 预览台），模板已带，不许拆。
组件用法见 references/components.md，装配细节见 references/app-assembly.md。

## 设计模式契约（生成 HTML 时必须遵守）

每个允许调整的元素挂 `data-eid="语义化唯一ID"`；双击改文字加 `data-etext`；
自由移动加 `data-edrag="free"`；可排序容器与其直接子元素都挂 `data-eid`。
用户在页面里拖改 + 写备注 → 导出 change-manifest.json → 按 data-eid 应用回源码。

## 质量闭环 · 每次生成 APP 必须完整执行

> **闭环没跑完 = 没做完。** 任何一步失败 → 修复 → 从第 1 步重跑整个闭环。
> 详细操作与验收标准见 references/quality-loop.md。

| # | 步骤 | 通过标准 |
|---|---|---|
| 1 | 静态校验 `node check.mjs` | 退出码 0 |
| 2 | 起静态服务器（`npx serve .` 等） | 页面可访问 |
| 3 | 逐页浏览器验证 | 每个页面可达；明暗切换全站跟随；强调色跟随；毛玻璃 关/轻盈/标准/浓郁 四态有可见差异，关闭态恢复实底；关键交互真实点击一次 |
| 4 | 截图存档 | light + dark 各一张 |
| 5 | 交付报告 | 输出验证矩阵（检查项 / 预期 / 结果） |

已知失败模式（`[hidden]` 失效、自定义属性循环引用、毛玻璃"无感"、
导航与视图不同步等）全部收录在 references/quality-loop.md 第 5 节，
命中后修复必须重跑闭环——修复本身经常引入新问题。

## 参考文档

| 文件 | 内容 |
|---|---|
| references/tokens.md | 令牌体系全表、定义层/引用层边界、check.mjs 执法原理 |
| references/components.md | kit.css 组件清单 + DOM 结构片段 |
| references/app-assembly.md | 壳层装配、设置页标配、材质系统深度解析 |
| references/quality-loop.md | 闭环流程详解、验证矩阵、失败模式库、交付报告模板 |
