#!/usr/bin/env node
/**
 * mark-vue CSS 层叠门禁：阻断方案 A 禁止的全局样式写法。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const srcRoot = join(projectRoot, 'src')
const errors = []

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (name !== 'node_modules') walk(full, acc)
      continue
    }
    acc.push(full)
  }
  return acc
}

function rel(path) {
  return relative(projectRoot, path).replace(/\\/g, '/')
}

function checkFile(path, content, rules) {
  for (const rule of rules) {
    rule.re.lastIndex = 0
    const match = rule.re.exec(content)
    if (match) {
      const line = content.slice(0, match.index).split('\n').length
      errors.push(`${rel(path)}:${line} ${rule.msg} → ${match[0]}`)
    }
  }
}

const styleFiles = walk(srcRoot).filter((f) => /\.(css|scss|ts)$/.test(f))
const vueFiles = walk(srcRoot).filter((f) => f.endsWith('.vue'))

const importRules = [
  { re: /@import\s+['"]tailwindcss['"]/g, msg: '禁止 @import "tailwindcss" 全量' },
  { re: /preflight\.css/g, msg: '禁止 Tailwind preflight.css' },
  { re: /import\s+['"]ant-design-vue\/dist\/reset\.css['"]/g, msg: 'reset.css 须经 ant-base.css 分层导入' },
]

const templatePaletteRules = [
  { re: /\bclass="[^"]*\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g, msg: '模板禁止 Tailwind 原生 palette class' },
  { re: /\bclass="[^"]*\brounded-(?:2xl|3xl|full)\b/g, msg: '模板禁止 rounded-2xl/3xl' },
]

const qualityTagRules = [
  { re: /<a-tag[^>]*\scolor=/g, msg: 'quality 域禁止 a-tag color=*，改用 UiTag tone' },
]

for (const file of styleFiles) {
  const content = readFileSync(file, 'utf8')
  const importRulesForFile = file.endsWith('ant-base.css')
    ? importRules.filter((rule) => !rule.re.source.includes('reset'))
    : importRules
  checkFile(file, content, importRulesForFile)
}

for (const file of vueFiles) {
  const content = readFileSync(file, 'utf8')
  const templateMatch = content.match(/<template[\s\S]*?<\/template>/)
  if (!templateMatch) continue
  const template = templateMatch[0]
  checkFile(file, template, templatePaletteRules)
  if (rel(file).includes('/views/quality/') || rel(file).includes('/components/quality/')) {
    checkFile(file, template, qualityTagRules)
  }
}

if (errors.length > 0) {
  console.error('css:guard failed:\n')
  for (const err of errors) console.error(`  - ${err}`)
  process.exit(1)
}

console.warn('css:guard passed')
