#!/usr/bin/env node
/**
 * frontend-design-mark Anti-AI-Slop 静态门禁（teacher/admin 工作台 + scanner-kiosk 壳层）。
 * 接入 pnpm typecheck，防止 decorative gradient / a-tag color / Tailwind 色板回潮。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')

const SCAN_ROOTS = [
  'src/views/teacher',
  'src/views/admin',
  'src/components/workbench',
  'src/components/mark',
  'src/views/scanner-kiosk',
]

const EXT = new Set(['.vue', '.scss', '.css'])

const WORKBENCH_GATES = [
  { id: 'gradient', pattern: /linear-gradient\s*\(/, message: '禁止 decorative linear-gradient' },
  { id: 'a-tag-color', pattern: /<a-tag[^>]*\scolor\s*=/, message: '禁止 a-tag color=，改用 UiTag tone' },
  { id: 'violet-primary', pattern: /#6366f1|#8b5cf6|#7c3aed/i, message: '禁止 indigo/violet 装饰主色' },
  { id: 'tailwind-radius', pattern: /\brounded-(2xl|3xl)\b/, message: '禁止 Tailwind 大圆角 rounded-2xl/3xl' },
  {
    id: 'tailwind-palette',
    pattern: /\b(?:text|bg|border|from|to|via)-(?:blue|purple|indigo|violet|fuchsia|pink)-\d{2,3}\b/,
    message: '禁止 Tailwind 色板类，改用 --dp-* / SCSS token',
  },
]

const KIOSK_EXTRA_GATES = [
  { id: 'kiosk-card', pattern: /<UiCard\b|<a-card\b/, message: 'Kiosk 禁止 UiCard/a-card 壳层' },
]

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walkFiles(abs, out)
      continue
    }
    const ext = abs.slice(abs.lastIndexOf('.'))
    if (EXT.has(ext)) out.push(abs)
  }
  return out
}

function collectTargets() {
  const files = []
  for (const rel of SCAN_ROOTS) {
    walkFiles(join(root, rel), files)
  }
  return files
}

function gatesForFile(relPath) {
  if (relPath.startsWith('src/views/scanner-kiosk/')) {
    return [
      { id: 'gradient', pattern: /linear-gradient\s*\(/, message: 'Kiosk 禁止 decorative linear-gradient' },
      ...KIOSK_EXTRA_GATES,
    ]
  }
  return WORKBENCH_GATES
}

function scanFile(absPath) {
  const rel = relative(root, absPath).replaceAll('\\', '/')
  const text = readFileSync(absPath, 'utf8')
  const errors = []
  for (const gate of gatesForFile(rel)) {
    const match = gate.pattern.exec(text)
    if (match) {
      const line = text.slice(0, match.index).split('\n').length
      errors.push(`${rel}:${line} ${gate.message}`)
    }
  }
  return errors
}

const files = collectTargets()
const errors = files.flatMap(scanFile)

if (errors.length) {
  console.error('verify-mark-ui-skill-gates 失败:')
  for (const err of errors) {
    console.error(`  - ${err}`)
  }
  process.exit(1)
}

process.stdout.write(`verify-mark-ui-skill-gates 通过（${files.length} 个文件）\n`)
