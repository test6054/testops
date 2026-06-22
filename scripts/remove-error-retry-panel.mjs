/**
 * 移除 UiErrorRetryPanel 模式：删除组件引用、内联错误块、loadError ref 赋值。
 * 加载失败仅保留 showUserError（右上角 message），页面维持空态/列表壳。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'src')

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules') continue
      walk(p, acc)
    } else if (/\.(vue|ts)$/.test(name)) {
      acc.push(p)
    }
  }
  return acc
}

function migrateVue(content, filePath) {
  if (!content.includes('UiErrorRetryPanel')) return content

  let next = content
  // 移除整块 UiErrorRetryPanel（含多行 props）
  next = next.replace(/^[ \t]*<UiErrorRetryPanel[\s\S]*?\/>[ \t]*\n?/gm, '')

  // 移除 import
  next = next.replace(
    /^import UiErrorRetryPanel from '@\/components\/ui-guide\/ui\/UiErrorRetryPanel\.vue'\n/gm,
    '',
  )

  // loadError ref 声明
  next = next.replace(/^[ \t]*const (\w+)(?:LoadError|loadError) = ref<Error \| null>\(null\)\n/gm, '')

  // 清空 loadError
  next = next.replace(/^[ \t]*\w+(?:LoadError|loadError)\.value = null\n/gm, '')

  // loadError = toUserError → showUserError（若同 catch 无 showUserError）
  next = next.replace(
    /^([ \t]*)(\w+(?:LoadError|loadError))\.value = toUserError\((error), ('[^']+'|"[^"]+")\)\n/gm,
    (match, indent, _ref, err, fallback) => {
      return `${indent}showUserError(${err}, ${fallback})\n`
    },
  )

  // 移除仅赋值 loadError 且无 showUserError 的 toUserError 行（已上面处理）

  // D-9 注释
  next = next.replace(/^[ \t]*\/\/ D-9[^\n]*UiErrorRetryPanel[^\n]*\n/gm, '')

  if (next !== content && !next.includes('showUserError') && next.includes('catch (error)')) {
    // 若文件有 catch 但无 showUserError，不自动加——需人工；多数已有
  }

  if (next.includes('showUserError') && !next.includes("from '@/utils/error-handler'")) {
    next = next.replace(
      /(import \{[^}]*)(} from '@\/utils\/error-handler')/,
      (m, a, b) => {
        if (a.includes('showUserError')) return m
        return `${a}, showUserError${b}`
      },
    )
    if (!next.includes('showUserError')) {
      next = next.replace(
        /(<script[^>]*>\n)/,
        "$1import { showUserError } from '@/utils/error-handler'\n",
      )
    }
  }

  // 移除未使用的 toUserError import
  if (next.includes("from '@/utils/error-handler'")) {
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
  }

  return next
}

function migrateTs(content) {
  let next = content
  if (next.includes('captureLoadFailure')) {
    next = next.replace(/\b\w+(?:LoadError|loadError)\.value = captureLoadFailure\(([^)]+)\)/g, 'showUserError($1)')
    next = next.replace(/\b\w+(?:LoadError|loadError)\.value = reportLoadFailure\(([^)]+)\)/g, 'showUserError($1)')
  }
  return next
}

const files = walk(src)
let changed = 0
for (const file of files) {
  if (file.endsWith('UiErrorRetryPanel.vue')) continue
  let content = fs.readFileSync(file, 'utf8')
  const orig = content
  if (file.endsWith('.vue')) content = migrateVue(content, file)
  else content = migrateTs(content)
  if (content !== orig) {
    fs.writeFileSync(file, content)
    changed++
    console.log('updated:', path.relative(root, file))
  }
}

// exam-workspace-layout: 移除快照内联重试条
const layoutPath = path.join(src, 'views/teacher/exam-workspace-layout.vue')
let layout = fs.readFileSync(layoutPath, 'utf8')
const layoutOrig = layout
layout = layout.replace(
  /[ \t]*<UiAlertStrip[\s\S]*?class="exam-detail-layout__journey-error"[\s\S]*?<\/UiAlertStrip>\n/,
  '',
)
if (layout !== layoutOrig) {
  fs.writeFileSync(layoutPath, layout)
  changed++
  console.log('updated: exam-workspace-layout.vue (journey error strip)')
}

console.log(`\nDone. ${changed} files updated.`)
