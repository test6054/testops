/**
 * 按 git diff 净变化修复 round4/restore 造成的 try/catch 括号错乱。
 * - 若 diff 删除了 `}` 且下一 context 是 `} catch` → 补回
 * - 若 diff 新增了多余 `}` 且上一 context 已有 `}` → 删除
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function gitDiff(rel) {
  try {
    return execSync(`git diff HEAD -- "${rel}"`, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (e) {
    return e.stdout?.toString() ?? ''
  }
}

/** @returns {Array<{ op: 'add' | 'remove', brace: string, catchLine: string }>} */
function parseBraceOps(diff) {
  /** @type {Array<{ op: 'add' | 'remove', brace: string, catchLine: string }>} */
  const ops = []
  const lines = diff.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('@@')) continue
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const added = line.slice(1)
      if (!/^\s+\}$/.test(added)) continue
      for (let j = i + 1; j < lines.length; j++) {
        const n = lines[j]
        if (n.startsWith('@@')) break
        if (n.startsWith('+') || n.startsWith('-')) continue
        if (n.startsWith(' ') && /^\s*\} catch\b/.test(n.slice(1))) {
          ops.push({ op: 'add', brace: added, catchLine: n.slice(1) })
        }
        break
      }
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      const removed = line.slice(1)
      if (!/^\s+\}$/.test(removed)) continue
      for (let j = i + 1; j < lines.length; j++) {
        const n = lines[j]
        if (n.startsWith('@@')) break
        if (n.startsWith('+') || n.startsWith('-')) continue
        if (n.startsWith(' ') && /^\s*\} catch\b/.test(n.slice(1))) {
          ops.push({ op: 'remove', brace: removed, catchLine: n.slice(1) })
        }
        break
      }
    }
  }
  return ops
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      if (name === 'node_modules') continue
      walk(p, acc)
    } else if (name.endsWith('.vue') || name.endsWith('.ts')) acc.push(p)
  }
  return acc
}

let fixed = 0
for (const abs of walk(path.join(root, 'src'))) {
  const rel = path.relative(root, abs).replace(/\\/g, '/')
  const diff = gitDiff(rel)
  if (!diff.includes('} catch')) continue
  const ops = parseBraceOps(diff)
  if (ops.length === 0) continue

  let content = fs.readFileSync(abs, 'utf8')
  let changed = false

  // 先补回 diff 中删除的括号
  for (const { op, brace, catchLine } of ops.filter((o) => o.op === 'remove')) {
    const fixedBlock = `${brace}\n${catchLine}`
    if (content.includes(fixedBlock)) continue
    const broken = `\n${catchLine}`
    if (content.includes(broken)) {
      content = content.replace(broken, `\n${fixedBlock}`)
      changed = true
    }
  }

  // 再删除 diff 中错误新增的括号（相对 HEAD 多出来的）
  for (const { brace, catchLine } of ops.filter((o) => o.op === 'add')) {
    const extra = `${brace}\n${catchLine}`
    if (content.includes(extra)) {
      content = content.replace(extra, `\n${catchLine}`)
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(abs, content)
    fixed++
    console.log(rel)
  }
}
console.log(`Brace net-fix: ${fixed} files`)
