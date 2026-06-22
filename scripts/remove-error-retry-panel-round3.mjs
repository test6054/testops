/**
 * 第三轮：全量清理 loadError / captureLoadFailure 残留。
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
    } else if (/\.(vue|ts)$/.test(name) && !name.endsWith('UiErrorRetryPanel.vue')) {
      acc.push(p)
    }
  }
  return acc
}

function ensureShowUserError(content) {
  if (!content.includes('showUserError(')) return content
  if (content.includes("@/utils/error-handler")) {
    return content.replace(
      /import \{([^}]+)\} from '@\/utils\/error-handler'/g,
      (m, imports) => {
        const parts = imports.split(',').map((s) => s.trim()).filter(Boolean)
        const filtered = parts.filter((p) => p !== 'captureLoadFailure' && p !== 'reportLoadFailure' && p !== 'toUserError' || content.includes(`${p}(`))
        if (!filtered.includes('showUserError') && content.includes('showUserError(')) {
          filtered.push('showUserError')
        }
        const final = [...new Set(filtered.filter((p) => {
          if (p === 'toUserError' && !content.includes('toUserError(')) return false
          return true
        }))]
        if (final.length === 0) return ''
        return `import { ${final.join(', ')} } from '@/utils/error-handler'`
      },
    )
  }
  return content.replace(
    /(<script[^>]*>\r?\n)/,
    "$1import { showUserError } from '@/utils/error-handler'\r\n",
  )
}

function migrate(content) {
  let next = content

  next = next.replace(
    /(\w+(?:LoadError|loadError))\.value = captureLoadFailure\(([^,]+),\s*([^)]+)\)/g,
    'showUserError($2, $3)',
  )

  next = next.replace(
    /(\w+(?:LoadError|loadError))\.value = toUserError\(([^,]+),\s*([^)]+)\)/g,
    'showUserError($2, $3)',
  )

  next = next.replace(
    /(\w+(?:LoadError|loadError))\.value = new Error\(([^)]+)\)/g,
    'showUserError(new Error($2), $2)',
  )

  // 孤立 loadError.value = null
  next = next.replace(/^\s*\w+(?:LoadError|loadError)\.value = null\r?\n/gm, '')

  // ref 声明
  next = next.replace(/^\s*const \w+(?:LoadError|loadError) = ref<(?:Error \| null|null \| Error)>\(null\)\r?\n/gm, '')

  // composable return 中的 loadError
  next = next.replace(/^\s*loadError,\r?\n/gm, '')
  next = next.replace(/^\s*loadError: \w+,\r?\n/gm, '')

  next = next.replace(/\r?\nimport UiErrorRetryPanel[^\r\n]*/g, '')

  next = ensureShowUserError(next)

  return next
}

let n = 0
for (const file of walk(src)) {
  const orig = fs.readFileSync(file, 'utf8')
  const next = migrate(orig)
  if (next !== orig) {
    fs.writeFileSync(file, next)
    n++
    console.log(path.relative(root, file))
  }
}
console.log(`Round 3: ${n} files`)
