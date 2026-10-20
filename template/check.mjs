#!/usr/bin/env node
/**
 * Apple UI Kit · 风格漂移检测器
 * ----------------------------------------------------------------------------
 * 把「别走样」从一句叮嘱变成一条能跑的命令。
 *
 *   node check.mjs                 # 默认扫 ./src（不存在则扫 .）
 *   node check.mjs src/            # 扫指定目录
 *   node check.mjs a.vue b.css     # 扫指定文件
 *   node check.mjs src/ --warn     # 同时列出警告
 *
 * 架构约定：tokens.css 与 kit.css 是**定义层**（色值与尺寸的合法出处），
 * 其余所有代码是**引用层**，只允许 var(--token)。本脚本机械地执行这条边界。
 *
 * 退出码：0 = 无错误；1 = 有错误（可直接接进 CI）
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// 定义层按**文件名**豁免：把 tokens.css / kit.css 原样拷到任何位置都自动豁免。
const DEFINITION_NAMES = new Set(['tokens.css', 'kit.css'])
const DEFINITION_FILES = new Set([
  path.resolve(HERE, 'tokens.css'),
  path.resolve(HERE, 'kit.css')
])
const isDefinition = (p) =>
  DEFINITION_FILES.has(path.resolve(p)) || DEFINITION_NAMES.has(path.basename(p).toLowerCase())

const EXTS = new Set(['.css', '.scss', '.less', '.html', '.vue', '.svelte', '.astro', '.jsx', '.tsx'])
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'out', 'dist', 'build', '.next', 'coverage',
  '.cache', 'release', '.vite', '.turbo', 'vendor'
])

// ── 命令行参数 ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const showWarn = argv.includes('--warn')
const tokensArgIdx = argv.findIndex((a) => a === '--tokens' || a.startsWith('--tokens='))
let tokensPath = path.join(HERE, 'tokens.css')
if (tokensArgIdx >= 0) {
  const a = argv[tokensArgIdx]
  tokensPath = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[tokensArgIdx + 1]
}
const targets = argv.filter((a, i) => {
  if (a.startsWith('--')) return false
  if (tokensArgIdx >= 0 && !argv[tokensArgIdx].includes('=') && i === tokensArgIdx + 1) return false
  return true
})
if (targets.length === 0) targets.push(existsSync('src') ? 'src' : '.')
// 令牌来源文件本身就是定义层，无条件豁免（不管它叫什么名字）
DEFINITION_FILES.add(path.resolve(tokensPath))

// 启发式：一个文件如果定义了 ≥3 个「值是颜色字面量」的自定义属性，
// 它就是一个色板文件 —— 那是字面色值的合法出处，整份豁免。
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/
function looksLikePalette(text) {
  let n = 0
  for (const m of text.matchAll(/--[a-z0-9-]+\s*:\s*([^;}]+)/g)) {
    if (COLOR_LITERAL.test(m[1]) && ++n >= 3) return true
  }
  return false
}

// ── 从令牌文件推导白名单（单一事实来源，永不手工维护）──────────────────
const tokensSrc = readFileSync(tokensPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const TOKEN_NAMES = new Set([...tokensSrc.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
const pxSet = (prefix) =>
  new Set(
    [...tokensSrc.matchAll(new RegExp(`--${prefix}[a-z0-9-]*\\s*:\\s*([0-9.]+)px`, 'g'))].map((m) =>
      parseFloat(m[1])
    )
  )
const ALLOWED_FONT = pxSet('text-')
const ALLOWED_RADIUS = pxSet('radius-')
const ALLOWED_DUR = pxSet('dur-')
const ALLOWED_EASING = new Set(
  [...tokensSrc.matchAll(/--ease-[a-z]+\s*:\s*(cubic-bezier\([^)]*\))/g)].map((m) =>
    m[0].replace(/\s+/g, '').toLowerCase().replace(/^--ease-[a-z]+:/, '')
  )
)
const OK_KEYWORDS = new Set(['transparent', 'currentcolor', 'inherit', 'none', 'initial', 'unset', 'auto'])

const HINT = {
  color: '用语义令牌替代，例如 color: var(--label) / background: var(--bg-raised)',
  token: '这个令牌不存在。改令牌名会连带破坏 kit.css —— 请用 tokens.json 里列出的名字',
  font: `桌面标准字号是 13px。允许：${[...ALLOWED_FONT].sort((a, b) => a - b).join(' ')}`,
  radius: `按档位取值。允许：${[...ALLOWED_RADIUS].sort((a, b) => a - b).join(' ')}px`,
  easing: `全站只允许 tokens.css 里的曲线。允许：${[...ALLOWED_EASING].join(' / ')}`,
  dur: `建议用 var(--dur-*) 三档。允许：${[...ALLOWED_DUR].sort((a, b) => a - b).join(' ')}ms`
}

// ── 采集目标文件 ──────────────────────────────────────────────────────────
function collect(target, acc, rootIsKit) {
  let st
  try {
    st = statSync(target)
  } catch {
    return acc
  }
  if (st.isDirectory()) {
    for (const name of readdirSync(target)) {
      if (SKIP_DIRS.has(name)) continue
      collect(path.join(target, name), acc, rootIsKit)
    }
  } else {
    if (!EXTS.has(path.extname(target).toLowerCase())) return acc
    if (isDefinition(target)) return acc // 定义层豁免
    acc.push(target)
  }
  return acc
}

// ── 单行扫描 ──────────────────────────────────────────────────────────────
function scan(text) {
  const errors = []
  const warnings = []
  const push = (arr, no, kind, value, line) => {
    if (arr.some((f) => f.line === no && f.kind === kind && f.value === value)) return
    arr.push({ line: no, kind, value, snippet: line.trim().slice(0, 72) })
  }

  text.split('\n').forEach((line, i) => {
    const no = i + 1
    const t = line.trim()
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return

    // 1) 硬编码色值
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (![4, 5, 7, 9].includes(m[0].length)) continue // #rgb/#rgba/#rrggbb/#rrggbbaa
      const before = line.slice(Math.max(0, m.index - 8), m.index)
      if (/href=["']?$/.test(before) || /url\($/.test(before)) continue // SVG 图标 id
      push(errors, no, 'color', m[0], line)
    }
    for (const m of line.matchAll(/\b(?:rgba?|hsla?)\s*\(/g)) {
      push(errors, no, 'color', m[0].replace(/\s*\($/, '()'), line)
    }

    // 2) 引用了不存在的令牌
    for (const m of line.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      if (!TOKEN_NAMES.has(m[1])) push(errors, no, 'token', m[1], line)
    }

    // 3) 非标字号
    for (const m of line.matchAll(/font-size\s*:\s*([^;{}]+)/g)) {
      const val = m[1].trim()
      if (val.includes('var(') || OK_KEYWORDS.has(val.toLowerCase())) continue
      const px = val.match(/^([0-9.]+)px$/)
      if (px && !ALLOWED_FONT.has(parseFloat(px[1]))) push(errors, no, 'font', val, line)
    }

    // 4) 非标圆角（支持 4 值简写）
    for (const m of line.matchAll(/border-radius\s*:\s*([^;{}]+)/g)) {
      for (const part of m[1].trim().split(/\s+/)) {
        if (part.includes('var(') || part.endsWith('%') || OK_KEYWORDS.has(part.toLowerCase())) continue
        const px = part.match(/^([0-9.]+)px$/)
        if (px && !ALLOWED_RADIUS.has(parseFloat(px[1]))) push(errors, no, 'radius', part, line)
      }
    }

    // 5) 非标缓动曲线
    for (const m of line.matchAll(/cubic-bezier\([^)]*\)/g)) {
      const v = m[0].replace(/\s+/g, '').toLowerCase()
      if (!ALLOWED_EASING.has(v)) push(errors, no, 'easing', m[0], line)
    }

    // 6) 非标时长（仅警告）
    for (const m of line.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*([^;{}]+)/g)) {
      for (const d of m[1].matchAll(/([0-9.]+)(ms|s)\b/g)) {
        const ms = d[2] === 's' ? parseFloat(d[1]) * 1000 : parseFloat(d[1])
        if (!ALLOWED_DUR.has(ms)) push(warnings, no, 'dur', d[0], line)
      }
    }
  })

  return { errors, warnings }
}

// ── 主流程 ────────────────────────────────────────────────────────────────
const files = []
for (const t of targets) collect(t, files, false)

let totalErr = 0
let totalWarn = 0
let paletteFiles = 0
const report = []

for (const file of files.sort()) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  // 去注释，避免注释里的示例色值误报
  text = text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, ' '))
  text = text.replace(/<!--[\s\S]*?-->/g, (s) => s.replace(/[^\n]/g, ' '))

  if (looksLikePalette(text)) {
    paletteFiles++
    continue
  }

  const { errors, warnings } = scan(text)
  totalErr += errors.length
  totalWarn += warnings.length
  if (errors.length || warnings.length) {
    report.push({ file: path.relative(process.cwd(), file) || file, errors, warnings })
  }
}

console.log('')
console.log('  Apple UI Kit · 风格漂移检测')
console.log(`  令牌来源 ${path.relative(process.cwd(), tokensPath) || tokensPath}  ·  ${TOKEN_NAMES.size} 个令牌`)
console.log(`  扫描 ${files.length} 个文件  ·  定义层豁免 ${DEFINITION_FILES.size + paletteFiles} 个`)
console.log('')

for (const { file, errors, warnings } of report) {
  if (errors.length) {
    console.log(`  ✗ ${file}`)
    for (const f of errors) {
      console.log(`      ${String(f.line).padStart(4)}  ${f.kind.padEnd(7)} ${f.value.padEnd(16)} ${f.snippet}`)
    }
    console.log('')
  }
  if (showWarn && warnings.length) {
    console.log(`  ! ${file}  (警告，不阻断)`)
    for (const f of warnings) {
      console.log(`      ${String(f.line).padStart(4)}  ${f.kind.padEnd(7)} ${f.value.padEnd(16)} ${f.snippet}`)
    }
    console.log('')
  }
}

const kinds = new Set(report.flatMap((r) => r.errors.map((e) => e.kind)))
if (totalErr) {
  console.log('  怎么改：')
  for (const k of kinds) console.log(`      ${k.padEnd(8)} ${HINT[k]}`)
  console.log('')
}

console.log(
  totalErr
    ? `  结果：${totalErr} 处错误${showWarn ? ` · ${totalWarn} 处警告` : ''}  →  风格已漂移\n`
    : `  结果：通过 ✓  0 处错误${showWarn ? ` · ${totalWarn} 处警告` : ''}${totalWarn && !showWarn ? '（加 --warn 查看）' : ''}\n`
)

process.exit(totalErr ? 1 : 0)
