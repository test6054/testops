/** 移除 catch 中连续的重复 showUserError 调用 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      if (name === 'node_modules')
        continue
      walk(p, acc)
    }
    else if (/\.(vue|ts)$/.test(name)) {
      acc.push(p)
    }
  }
  return acc
}

let n = 0
for (const file of walk(root)) {
  const orig = fs.readFileSync(file, 'utf8')
  const next = orig.replace(
    /(showUserError\([^)]+\))\r?\n[ \t]*showUserError\([^)]+\)/g,
    '$1',
  )
  if (next !== orig) {
    fs.writeFileSync(file, next)
    n++
    console.warn(path.relative(root, file))
  }
}
console.warn(`Deduped showUserError in ${n} files`)
