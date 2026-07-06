#!/usr/bin/env node
/**
 * 校验 quality 叶子路由 meta.scopeProfile / qualityGate（含 SCOPE_* 展开）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const qualityRoutesPath = join(root, 'src/router/routes/quality.ts')
const source = readFileSync(qualityRoutesPath, 'utf8')

const scopeConsts = {}
for (const match of source.matchAll(/const (SCOPE_[A-Z_]+|GATE_[A-Z_]+)(?:\s*:\s*\w+)?\s*=\s*\{([^}]*)\}/g)) {
  scopeConsts[match[1]] = match[2]
}

function resolveSpread(constName) {
  const body = scopeConsts[constName]
  if (!body) return {}
  const scopeMatch = /scopeProfile:\s*'([^']+)'/.exec(body)
  const gateMatch = /qualityGate:\s*'([^']+)'/.exec(body)
  return {
    scopeProfile: scopeMatch?.[1],
    qualityGate: gateMatch?.[1],
  }
}

const routeBlocks = [...source.matchAll(/\{\s*\n\s*path:\s*'[^']+'[\s\S]*?\n\s*\},?\n/g)]
const routes = new Map()

for (const block of routeBlocks) {
  const text = block[0]
  const nameMatch = /name:\s*'([^']+)'/.exec(text)
  if (!nameMatch || !text.includes('component:')) continue
  const name = nameMatch[1]
  if (name === 'QualityLayout') continue

  let scopeProfile
  let qualityGate
  for (const spread of text.matchAll(/\.\.\.(SCOPE_[A-Z_]+|GATE_[A-Z_]+)/g)) {
    const resolved = resolveSpread(spread[1])
    if (resolved.scopeProfile) scopeProfile = resolved.scopeProfile
    if (resolved.qualityGate) qualityGate = resolved.qualityGate
  }
  const inlineScope = /scopeProfile:\s*'([^']+)'/.exec(text)
  const inlineGate = /qualityGate:\s*'([^']+)'/.exec(text)
  if (inlineScope) scopeProfile = inlineScope[1]
  if (inlineGate) qualityGate = inlineGate[1]

  routes.set(name, { scopeProfile, qualityGate })
}

const planProfiles = new Set(['plan', 'plan-period', 'plan-course', 'accreditation'])
const errors = []

for (const [name, meta] of routes) {
  if (!meta.scopeProfile) {
    errors.push(`路由 ${name} 缺少 meta.scopeProfile（含 SCOPE_* 展开）`)
    continue
  }
  if (meta.qualityGate === 'plan-confirmed' && !planProfiles.has(meta.scopeProfile)) {
    errors.push(
      `路由 ${name} qualityGate=plan-confirmed 但 scopeProfile=${meta.scopeProfile} 不含 plan 维度`,
    )
  }
}

const contractPath = join(root, 'src/constants/quality-route-contract.ts')
const contractSource = readFileSync(contractPath, 'utf8')
const contractNames = [...contractSource.matchAll(/name:\s*'([^']+)'/g)].map(m => m[1])

for (const contractName of contractNames) {
  if (!routes.has(contractName)) {
    errors.push(`契约表路由 ${contractName} 在 quality.ts 中未找到`)
  }
}

for (const [name] of routes) {
  if (!contractNames.includes(name)) {
    errors.push(`quality.ts 路由 ${name} 未写入 quality-route-contract.ts`)
  }
}

if (errors.length) {
  console.error('verify-quality-route-contract 失败:')
  for (const err of errors) {
    console.error(`  - ${err}`)
  }
  process.exit(1)
}

process.stdout.write(`verify-quality-route-contract 通过（${routes.size} 条叶子路由）\n`)
