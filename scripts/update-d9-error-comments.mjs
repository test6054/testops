/** 批量更新 D-9 过时注释：错误面板已改为 toast + 空态 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

const replacements = [
  [/<!-- D-9 错误态：[^]*?-->\n/g, ''],
  [/\/\/ D-9：[^\n]*展示可重试错误面板\n/g, '// 加载失败：toast 提示，主区保持空态/列表壳\n'],
  [/\/\/ D-9 错误态：[^\n]*\n/g, '// 加载失败：toast 提示，主区保持空态/列表壳\n'],
  [/\/\/ D-9：[^\n]*\n/g, (line) => {
    if (line.includes('toast')) return line
    return '// 加载失败：toast 提示，主区保持空态/列表壳\n'
  }],
]

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      if (name === 'node_modules') continue
      walk(p, acc)
    } else if (/\.(vue|ts)$/.test(name)) acc.push(p)
  }
  return acc
}

let n = 0
for (const file of walk(root)) {
  let content = fs.readFileSync(file, 'utf8')
  if (!content.includes('D-9')) continue
  const orig = content
  for (const [re, rep] of replacements) {
    content = content.replace(re, rep)
  }
  if (content !== orig) {
    fs.writeFileSync(file, content)
    n++
    console.log(path.relative(root, file))
  }
}
console.log(`Updated D-9 comments in ${n} files`)
