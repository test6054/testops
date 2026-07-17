#!/usr/bin/env node
/**
 * 分批运行单元测试，输出 JSON 结果到 /tmp 或 coverage 旁。
 * 用法: node scripts/run-unit-batch.mjs enums|utils|apis|stores|all
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vitest = path.join(root, 'node_modules/.bin/vitest')

const batches = {
  enums: ['tests/unit/types/enums'],
  constants: ['tests/unit/constants'],
  utils: ['tests/unit/utils'],
  apis: ['tests/unit/apis'],
  stores: ['tests/unit/stores'],
  composables: ['tests/unit/composables', 'tests/unit/hooks'],
  router: ['tests/unit/router'],
  config: ['tests/unit/config'],
  wire: ['tests/unit/wire'],
  components: ['tests/unit/components'],
  views: ['tests/unit/views'],
  layout: ['tests/unit/layout'],
  types: ['tests/unit/types'],
}

const name = process.argv[2] || 'all'
const names = name === 'all' ? Object.keys(batches) : [name]
if (!batches[names[0]] && name !== 'all') {
  console.error('unknown batch', name, 'known', Object.keys(batches).join(','))
  process.exit(2)
}

function runOne(batchName) {
  return new Promise((resolve) => {
    const outJson = path.join(root, 'coverage', `batch-${batchName}.json`)
    const outLog = path.join(root, 'coverage', `batch-${batchName}.log`)
    fs.mkdirSync(path.dirname(outJson), { recursive: true })
    const log = fs.openSync(outLog, 'w')
    const args = ['run', ...batches[batchName], '--maxWorkers', '4', '--reporter', 'json', '--outputFile', outJson]
    console.log('[run]', batchName, args.join(' '))
    const child = spawn(vitest, args, {
      cwd: root,
      stdio: ['ignore', log, log],
      detached: true,
      env: process.env,
    })
    child.unref()
    const timer = setInterval(() => {
      if (fs.existsSync(outJson)) {
        clearInterval(timer)
        try {
          const d = JSON.parse(fs.readFileSync(outJson, 'utf8'))
          console.log('[done]', batchName, {
            success: d.success,
            pass: d.numPassedTests,
            fail: d.numFailedTests,
            total: d.numTotalTests,
          })
        } catch (e) {
          console.log('[done]', batchName, 'json parse pending', e.message)
        }
        resolve(batchName)
      }
    }, 2000)
    child.on('exit', (code) => {
      console.log('[exit]', batchName, code)
      // keep interval until json appears
      setTimeout(() => {
        clearInterval(timer)
        resolve(batchName)
      }, 1000)
    })
  })
}

// sequential to avoid overload
for (const n of names) {
  await runOne(n)
}
