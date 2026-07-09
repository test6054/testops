import fs from 'node:fs'
import path from 'node:path'

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        walk(fullPath, acc)
      }
      continue
    }
    if (/\.(ts|vue)$/.test(entry.name)) {
      acc.push(fullPath)
    }
  }
  return acc
}

let fixed = 0
for (const file of walk('src')) {
  const original = fs.readFileSync(file, 'utf8')
  const next = original.replace(
    /^export type (\w+)\r?\n\s+=/gm,
    (_, name) => `export type ${name} =\n  `,
  )
  if (next !== original) {
    fs.writeFileSync(file, next)
    fixed += 1
  }
}

console.warn(`fix-type-export-linebreak: updated ${fixed} files`)
