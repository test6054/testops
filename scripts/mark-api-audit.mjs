#!/usr/bin/env node
/**
 * mark-vue ↔ edu-mark 浏览器端 API 路径对账脚本。
 * 用法：node scripts/mark-api-audit.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '../..')
const repoRoot = join(root, '..')
const ctrlDir = join(repoRoot, 'edu-practice/edu-mark/src/main/java/com/nybc/mark/controller')
const apisDir = join(root, 'src/apis/mark')

const DEVICE_PREFIXES = [
  '/api/mark/scanner-push',
  '/api/mark/scanner-agent',
  '/api/mark/exams/scanned-pages',
  '/api/mark/exams/scan-sources',
  '/api/mark/exams/recognition/',
  '/api/internal/',
]

const WEBHOOK_PATHS = new Set(['/api/exam/teaching-affairs/passback/callback'])

function walkTsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      out.push(...walkTsFiles(p))
    } else if (name.endsWith('.ts')) {
      out.push(p)
    }
  }
  return out
}

function parseBackend() {
  const endpoints = []
  for (const name of readdirSync(ctrlDir)) {
    if (!name.endsWith('.java') || name.includes('internal')) continue
    const text = readFileSync(join(ctrlDir, name), 'utf8')
    const baseMatch = text.match(/@RequestMapping\("([^"]+)"\)/)
    if (!baseMatch) continue
    const prefix = baseMatch[1]
    if (prefix.includes('/internal/')) continue
    for (const m of text.matchAll(/@(Post|Get)Mapping\("([^"]+)"\)/g)) {
      endpoints.push({
        method: m[1].toUpperCase(),
        path: prefix.replace(/\/$/, '') + m[2],
        controller: name,
      })
    }
  }
  return endpoints
}

function parseFrontend() {
  const paths = new Set()
  for (const file of walkTsFiles(apisDir)) {
    const text = readFileSync(file, 'utf8')
    if (file.endsWith('scanner-agent-local.ts')) continue
    for (const m of text.matchAll(/['"`](\/api\/[^'"`?]+)/g)) {
      paths.add(m[1])
    }
  }
  paths.add('/api/mark/sse/scan-live/subscribe')
  return paths
}

function classify(path) {
  if (WEBHOOK_PATHS.has(path)) return 'webhook'
  if (DEVICE_PREFIXES.some((p) => path.startsWith(p))) return 'device'
  return 'browser'
}

const backend = parseBackend()
const frontend = parseFrontend()

const missing = []
const covered = []

for (const ep of backend) {
  const kind = classify(ep.path)
  if (kind !== 'browser') continue
  const hit = [...frontend].some((p) => p === ep.path || ep.path.startsWith(p))
  if (hit) covered.push(ep)
  else missing.push(ep)
}

console.log('=== mark-vue ↔ edu-mark 浏览器端 API 对账 ===\n')
console.log(`后端 Controller 端点：${backend.length}`)
console.log(`前端 apis/mark 路径：${frontend.size}`)
console.log(`浏览器端已覆盖：${covered.length}`)
console.log(`浏览器端缺失：${missing.length}\n`)

if (missing.length) {
  console.log('缺失列表：')
  for (const ep of missing) {
    console.log(`  ${ep.method.padEnd(4)} ${ep.path}  (${ep.controller})`)
  }
  process.exitCode = 1
} else {
  console.log('浏览器可调用端点已全部在 apis/mark 中声明。')
}

console.log('\n设备/内部/Webhook（不要求 mark-vue 封装）：')
for (const ep of backend) {
  const kind = classify(ep.path)
  if (kind === 'browser') continue
  console.log(`  [${kind}] ${ep.method} ${ep.path}`)
}
