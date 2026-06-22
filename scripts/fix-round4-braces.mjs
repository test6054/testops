/**
 * 恢复 round4 误删的 try/catch 闭合大括号。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let diff
try {
  diff = execSync('git diff -U3 src/', { cwd: root, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
} catch (e) {
  diff = e.stdout?.toString() ?? ''
}

/** @type {Map<string, Array<string>>} */
const restorations = new Map()

const fileRe = /^diff --git a\/(.+?) b\/.+$/gm
let fileMatch
while ((fileMatch = fileRe.exec(diff)) !== null) {
  const rel = fileMatch[1]
  const start = fileMatch.index
  const next = diff.indexOf('\ndiff --git ', start + 1)
  const chunk = diff.slice(start, next === -1 ? diff.length : next)
  const lines = chunk.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('-') || line.startsWith('---')) continue
    const removed = line.slice(1)
    if (!/^\s+\}$/.test(removed)) continue

    for (let j = i + 1; j < lines.length; j++) {
      const n = lines[j]
      if (n.startsWith('@@')) break
      if (n.startsWith('+') || n.startsWith('-')) continue
      if (n.startsWith(' ') && /^\s*\} catch\b/.test(n.slice(1))) {
        const catchLine = n.slice(1)
        const arr = restorations.get(rel) ?? []
        arr.push(`${removed}\n${catchLine}`)
        restorations.set(rel, arr)
      }
      break
    }
  }
}

let fixed = 0
for (const [rel, blocks] of restorations) {
  const abs = path.join(root, rel.replace(/\//g, path.sep))
  if (!fs.existsSync(abs)) continue
  let content = fs.readFileSync(abs, 'utf8')
  let changed = false
  for (const block of blocks) {
    const [braceLine, catchLine] = block.split('\n')
    const fixedBlock = `${braceLine}\n${catchLine}`
    if (content.includes(fixedBlock)) continue
    const broken = `\n${catchLine}`
    if (content.includes(broken)) {
      content = content.replace(broken, `\n${fixedBlock}`)
      changed = true
    }
  }
  if (changed) {
    fs.writeFileSync(abs, content)
    fixed++
    console.log(rel)
  }
}
console.log(`Restored braces in ${fixed} files`)
