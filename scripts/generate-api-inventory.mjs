/**
 * 从 src/apis 提取 HTTP 调用，生成 mark-vue API 清单 Markdown。
 * 用法：node scripts/generate-api-inventory.mjs > ../docs/plans/2026-06-19-mark-vue-api-inventory.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apisRoot = path.join(__dirname, '../src/apis')
const markControllerDir = path.join(__dirname, '../../edu-practice/edu-mark/src/main/java/com/nybc/mark/controller')
const qualityControllerDir = path.join(__dirname, '../../edu-practice/edu-quality/src/main/java')

function walkTs(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walkTs(p, files)
    else if (name.endsWith('.ts')) files.push(p)
  }
  return files
}

function nearestFunctionName(text, index) {
  const before = text.slice(0, index)
  const exportFn = [...before.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)]
  if (exportFn.length) return exportFn[exportFn.length - 1][1]
  const objKey = [...before.matchAll(/^\s*(\w+)\s*:\s*(?:async\s*)?\(/gm)]
  if (objKey.length) return objKey[objKey.length - 1][1]
  return '?'
}

function parseBaseConstants(text) {
  const bases = {}
  const re = /const\s+(\w+)\s*=\s*['`]([^'`]+)['`]/g
  let m
  while ((m = re.exec(text))) {
    if (m[2].startsWith('/api/')) bases[m[1]] = m[2]
  }
  return bases
}

function resolveTemplateUrl(raw, bases) {
  const tpl = raw.replace(/\$\{(\w+)\}/g, (_, name) => bases[name] ?? `\${${name}}`)
  if (tpl.includes('${')) return null
  return tpl.replace(/\/+/g, '/')
}

function extractFromFile(file) {
  const rel = path.relative(apisRoot, file).replace(/\\/g, '/')
  const text = fs.readFileSync(file, 'utf8')
  const bases = parseBaseConstants(text)
  const rows = []

  const patterns = [
    /http\.(post|get|put|delete)(?:<[^>]*>)?\s*\(\s*['`]([^'`$]+)['`]/g,
    /http\.(post|get|put|delete)(?:<[^>]*>)?\s*\(\s*`([^`]+)`/g,
  ]

  for (const re of patterns) {
    let m
    while ((m = re.exec(text))) {
      const method = m[1].toUpperCase()
      const url = m[2].startsWith('/') ? m[2] : resolveTemplateUrl(m[2], bases)
      if (!url || url.includes('${')) continue
      rows.push({
        fn: nearestFunctionName(text, m.index),
        method,
        url,
        file: `src/apis/${rel}`,
      })
    }
  }
  return rows
}

function extractFrontendApis() {
  const rows = []
  for (const file of walkTs(apisRoot)) {
    rows.push(...extractFromFile(file))
  }
  const dedup = new Map()
  for (const r of rows) {
    dedup.set(`${r.file}|${r.fn}|${r.method}|${r.url}`, r)
  }
  return [...dedup.values()]
}

function extractControllerPaths(dir) {
  if (!fs.existsSync(dir)) return new Set()
  const paths = new Set()
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name)
      if (fs.statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('Controller.java')) {
        const text = fs.readFileSync(p, 'utf8')
        const prefixMatch = text.match(/@RequestMapping\("([^"]+)"/)
        const prefix = prefixMatch ? prefixMatch[1] : ''
        const re = /@(?:Post|Get)Mapping\("([^"]*)"\)/g
        let m
        while ((m = re.exec(text))) {
          const full = `${prefix}/${m[1]}`.replace(/\/+/g, '/')
          paths.add(full.startsWith('/') ? full : `/${full}`)
        }
      }
    }
  }
  walk(dir)
  return paths
}

const rows = extractFrontendApis()
const markPaths = extractControllerPaths(markControllerDir)
const qualityPaths = extractControllerPaths(qualityControllerDir)

function probe(url) {
  if (url.startsWith('/api/mark/') || url.startsWith('/api/exam/')) {
    if (markPaths.has(url) || qualityPaths.has(url)) return '✅'
    return '❌'
  }
  if (url.startsWith('/api/quality/')) {
    return qualityPaths.has(url) ? '✅' : '❓'
  }
  return '🌐'
}

const byModule = {}
for (const row of rows) {
  const parts = row.file.replace('src/apis/', '').split('/')
  const mod = parts.length > 1 ? parts[0] : parts[0].replace('.ts', '')
  byModule[mod] = (byModule[mod] || 0) + 1
}

const lines = []
lines.push('# mark-vue 前端 API 接口清单')
lines.push('')
lines.push('> 自动生成：`edu-practice-mark-vue/scripts/generate-api-inventory.mjs`')
lines.push(`> 生成时间：${new Date().toISOString().slice(0, 10)}`)
lines.push('> 审查跟踪：`docs/plans/2026-06-19-mark-vue-api-audit-tracker.md`')
lines.push('')
lines.push('## 统计')
lines.push('')
lines.push('| 模块 | 接口数 |')
lines.push('|---|---:|')
for (const [mod, count] of Object.entries(byModule).sort()) {
  lines.push(`| ${mod} | ${count} |`)
}
lines.push(`| **合计** | **${rows.length}** |`)
lines.push('')

const grouped = {}
for (const row of rows) {
  const key = row.file.replace('src/apis/', '').split('/')[0]
  if (!grouped[key]) grouped[key] = []
  grouped[key].push(row)
}

for (const [section, sectionRows] of Object.entries(grouped).sort()) {
  lines.push(`## ${section}`)
  lines.push('')
  lines.push('| 函数 | 方法 | 路径 | 源文件 | 路由探测 | 审查状态 |')
  lines.push('|---|---|---|---|---|---|')
  for (const r of sectionRows.sort((a, b) => a.url.localeCompare(b.url) || a.fn.localeCompare(b.fn))) {
    lines.push(`| \`${r.fn}\` | ${r.method} | \`${r.url}\` | \`${r.file}\` | ${probe(r.url)} | 待审查 |`)
  }
  lines.push('')
}

process.stdout.write(lines.join('\n'))
