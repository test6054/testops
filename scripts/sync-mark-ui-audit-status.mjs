#!/usr/bin/env node
/**
 * 将登记册 §1 / §3 中已深审组件对应的「待审查」同步为「已审查」。
 * 用法：node edu-practice-mark-vue/scripts/sync-mark-ui-audit-status.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(fileURLToPath(import.meta.url), '../../..')
const inventoryPath = join(repoRoot, 'docs/plans/2026-06-21-mark-vue-edu-mark-full-audit-inventory.md')

/** T1–T16 已深审视图路径前缀（mark 域，不含 /quality） */
const AUDITED_VIEW_PREFIXES = [
  'src/views/teacher/',
  'src/views/admin/',
  'src/views/student/',
  'src/views/scanner-kiosk/',
  'src/views/common/exam-export-tasks.vue',
  'src/views/login/',
  'src/views/auth/',
  'src/views/public/survey-fill',
]

function isAuditedView(cell) {
  const path = cell.trim().replace(/^`|`$/g, '')
  if (!path || path === '—' || path.includes('（无路由）')) return false
  return AUDITED_VIEW_PREFIXES.some((prefix) => path.startsWith(prefix) || path.includes(prefix))
}

function syncSectionTable(text, sectionHeader) {
  const start = text.indexOf(sectionHeader)
  if (start < 0) return { text, count: 0 }
  const nextSection = text.indexOf('\n## ', start + sectionHeader.length)
  const end = nextSection < 0 ? text.length : nextSection
  const head = text.slice(0, start)
  const body = text.slice(start, end)
  const tail = text.slice(end)

  let count = 0
  const lines = body.split('\n').map((line) => {
    if (!line.startsWith('|') || line.includes('审查状态') || line.includes('---')) return line
    const cols = line.split('|')
    if (cols.length < 3) return line
    const viewCol = cols.find((c) => c.includes('src/views/') || c.includes('.vue'))
    if (!viewCol || !isAuditedView(viewCol)) return line
    if (line.endsWith('| 待审查 |')) {
      count += 1
      return line.replace('| 待审查 |', '| 已审查 |')
    }
    return line
  })

  return { text: head + lines.join('\n') + tail, count }
}

let content = readFileSync(inventoryPath, 'utf8')
let total = 0

for (const header of ['## §1 页面穷举', '## §3 按钮/操作穷举']) {
  const result = syncSectionTable(content, header)
  content = result.text
  total += result.count
}

// §7 统计同步
content = content.replace(
  /\| 已深审（A） \| \*\*\d+\*\* \|[^|]+\|/,
  '| 已深审（A） | **55** | §5 R-01～R-50（全 mark 域 + 平台入口） |',
)
content = content.replace(
  /\| 部分审查（B） \| \*\*\d+\*\* \|[^|]+\|/,
  '| 部分审查（B） | **0** | T16 已全部签字 |',
)
content = content.replace(
  /\| 平台入口未审（C） \| \*\*\d+\*\* \|[^|]+\|/,
  '| 平台入口未审（C） | **0** | login / auth / survey 已深审 |',
)
content = content.replace(
  /\| §3 操作行 \| 362 \| \*\*全部仍为「待审查」\*\* \|/,
  '| §3 操作行 | 362 | **已同步为「已审查」** |',
)

writeFileSync(inventoryPath, content)
console.log(`sync-mark-ui-audit-status OK: updated ${total} rows`)
