#!/usr/bin/env node
/**
 * 读取 coverage/coverage-summary.json，输出未达 100% 的文件清单。
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const summaryPath = path.join(root, 'coverage/coverage-summary.json')
if (!fs.existsSync(summaryPath)) {
  console.error('missing coverage/coverage-summary.json — run pnpm test:coverage first')
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const rows = []
for (const [file, metrics] of Object.entries(data)) {
  if (file === 'total') continue
  const { lines, statements, functions, branches } = metrics
  const pcts = [lines.pct, statements.pct, functions.pct, branches.pct]
  if (pcts.some((p) => p < 100)) {
    rows.push({
      file: file.replace(root + '/', ''),
      lines: lines.pct,
      statements: statements.pct,
      functions: functions.pct,
      branches: branches.pct,
      uncoveredLines: lines.total - lines.covered,
    })
  }
}
rows.sort((a, b) => a.lines - b.lines || b.uncoveredLines - a.uncoveredLines)
console.log(JSON.stringify({ gapFiles: rows.length, totalTracked: Object.keys(data).length - 1, worst: rows.slice(0, 50) }, null, 2))
fs.writeFileSync(path.join(root, 'coverage/gaps.json'), JSON.stringify(rows, null, 2))
console.log('wrote coverage/gaps.json')
