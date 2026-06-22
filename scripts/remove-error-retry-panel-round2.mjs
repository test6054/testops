/**
 * 第二轮：清理残留 import、loadError ref、toUserError 赋值；统一为 showUserError。
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
    } else if (/\.vue$/.test(name)) {
      acc.push(p)
    }
  }
  return acc
}

function ensureShowUserErrorImport(content) {
  if (!content.includes('showUserError(')) return content
  if (content.includes('showUserError') && content.includes("@/utils/error-handler")) {
    return content.replace(
      /import \{([^}]+)\} from '@\/utils\/error-handler'/g,
      (m, imports) => {
        const parts = imports.split(',').map((s) => s.trim()).filter(Boolean)
        if (parts.includes('showUserError')) return m
        return `import { ${[...parts, 'showUserError'].join(', ')} } from '@/utils/error-handler'`
      },
    )
  }
  return content.replace(
    /(<script[^>]*>\r?\n)/,
    "$1import { showUserError } from '@/utils/error-handler'\r\n",
  )
}

function cleanImports(content) {
  let next = content
  next = next.replace(/\r?\nimport UiErrorRetryPanel from '@\/components\/ui-guide\/ui\/UiErrorRetryPanel\.vue'/g, '')
  next = next.replace(
    /import \{([^}]+)\} from '@\/utils\/error-handler'/g,
    (m, imports) => {
      const parts = imports.split(',').map((s) => s.trim()).filter(Boolean)
      const kept = parts.filter((p) => {
        if (p === 'toUserError' && !next.includes('toUserError(')) return false
        if (p === 'captureLoadFailure' && !next.includes('captureLoadFailure(')) return false
        if (p === 'reportLoadFailure' && !next.includes('reportLoadFailure(')) return false
        return true
      })
      if (kept.length === 0) return ''
      return `import { ${kept.join(', ')} } from '@/utils/error-handler'`
    },
  )
  return next
}

function migrate(content) {
  let next = content

  next = next.replace(
    /^[ \t]*(\w+(?:LoadError|loadError))\.value = toUserError\(([^,]+),\s*([^)]+)\)\r?\n/gm,
    (match, _ref, err, fallback) => {
      return `    showUserError(${err}, ${fallback})\n`
    },
  )

  next = next.replace(/^[ \t]*const \w+(?:LoadError|loadError) = ref<Error \| null>\(null\)\r?\n/gm, '')
  next = next.replace(/^[ \t]*\w+(?:LoadError|loadError)\.value = null\r?\n/gm, '')

  next = next.replace(/ && !loadError/g, '')
  next = next.replace(/ && !\w+LoadError/g, '')

  next = cleanImports(next)
  next = ensureShowUserErrorImport(next)

  return next
}

let changed = 0
for (const file of walk(src)) {
  const orig = fs.readFileSync(file, 'utf8')
  const next = migrate(orig)
  if (next !== orig) {
    fs.writeFileSync(file, next)
    changed++
    console.log('fixed:', path.relative(root, file))
  }
}

// layout journey error strip
const layoutPath = path.join(src, 'views/teacher/exam-workspace-layout.vue')
let layout = fs.readFileSync(layoutPath, 'utf8')
const layoutBlock = /[ \t]*<UiAlertStrip\r?\n[ \t]*v-if="snapshotError"[\s\S]*?<\/UiAlertStrip>\r?\n/
if (layoutBlock.test(layout)) {
  layout = layout.replace(layoutBlock, '')
  layout = layout.replace(
    'v-else-if="loading && !snapshot"',
    'v-if="loading && !snapshot"',
  )
  fs.writeFileSync(layoutPath, layout)
  changed++
  console.log('fixed: exam-workspace-layout.vue')
}

console.log(`\nRound 2 done. ${changed} files.`)
