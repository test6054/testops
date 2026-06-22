/**
 * 第五轮：安全清理 loadError 残留（不碰模板 v-else / try-catch 括号）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'src')

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

function migrate(content, file) {
  let next = content

  // catch 中 loadError 赋值 + showUserError → 仅 showUserError
  next = next.replace(
    /[ \t]*\w*(?:LoadError|loadError)\.value = toUserError\([^)]+\)\r?\n([ \t]*showUserError\([^)]+\))/g,
    '$1',
  )
  next = next.replace(
    /[ \t]*\w*(?:LoadError|loadError)\.value = toUserError\(([^)]+)\)/g,
    (m, args) => {
      const indent = m.match(/^([ \t]*)/)?.[1] ?? '    '
      return `${indent}showUserError(${args})`
    },
  )

  next = next.replace(/^[ \t]*\w*(?:LoadError|loadError)\.value = null\r?\n/gm, '')
  next = next.replace(/^[ \t]*const \w*(?:LoadError|loadError)\b = ref(?:<[^>]+>)?\([^)]*\)\r?\n/gm, '')

  // 移除内联 progressHistoryLoadError AlertStrip
  next = next.replace(
    /[ \t]*<UiAlertStrip\r?\n[ \t]*v-if="progressHistoryLoadError"[\s\S]*?<\/UiAlertStrip>\r?\n/g,
    '',
  )

  // exam-list / archive-list 等 script 中对已删 ref 的引用
  next = next.replace(/progressLoadError\.value/g, 'false')
  next = next.replace(/if \(archiveLoadError\.value\) return null\r?\n[ \t]*/g, '')

  // useKioskWorkflow 导出列表
  next = next.replace(/^\s*examOptionLoadError,\r?\n/gm, '')

  // useMarkExamRoster return
  next = next.replace(/^\s*loadError,\r?\n/gm, '')

  // improvement-workbench
  next = next.replace(/function clearWorkbenchLoadError\(\): void \{\r?\n\}\r?\n\r?\n/, '')
  next = next.replace(/[ \t]*clearWorkbenchLoadError\(\)\r?\n/g, '')

  if (next.includes('showUserError(') && file.endsWith('.vue') && next.includes('<script')) {
    if (next.includes("@/utils/error-handler")) {
      next = next.replace(/import \{([^}]+)\} from '@\/utils\/error-handler'/g, (m, imp) => {
        const parts = imp.split(',').map((s) => s.trim()).filter(Boolean)
        const filtered = parts.filter((p) => {
          if (p === 'toUserError' && !/\btoUserError\s*\(/.test(next)) return false
          return true
        })
        if (!filtered.includes('showUserError') && next.includes('showUserError(')) {
          filtered.push('showUserError')
        }
        return filtered.length ? `import { ${[...new Set(filtered)].join(', ')} } from '@/utils/error-handler'` : ''
      })
    }
  }

  return next
}

let n = 0
for (const file of walk(src)) {
  if (file.includes('router/index.ts') || file.includes('HeaderRightBar')) continue
  const orig = fs.readFileSync(file, 'utf8')
  if (!/(?:LoadError|loadError)/.test(orig)) continue
  const next = migrate(orig, file)
  if (next !== orig) {
    fs.writeFileSync(file, next)
    n++
    console.log(path.relative(root, file))
  }
}
console.log(`Round 5: ${n} files`)
