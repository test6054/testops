/**
 * 第四轮：修复移除 UiErrorRetryPanel 后的 v-else 孤儿、loadError 残留、内联错误条。
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
    } else if (name.endsWith('.vue')) acc.push(p)
  }
  return acc
}

function migrate(content) {
  let next = content

  // 移除紧跟开标签后的孤儿 v-else（原 UiErrorRetryPanel v-if 的兄弟）
  next = next.replace(/(<Ui[A-Za-z]+[^>\n]*)\r?\n[ \t]*v-else\r?\n/g, '$1\n')
  next = next.replace(/(<a-card[^>\n]*)\r?\n[ \t]*v-else\r?\n/gi, '$1\n')
  next = next.replace(/(<UiDataTable)\r?\n[ \t]*v-else\r?\n/g, '$1\n')

  // a-spin 下首个 UiEmpty 的 v-else-if → v-if
  next = next.replace(
    /(<a-spin[^>]*>\s*\n\s*<UiEmpty\r?\n\s*)v-else-if=/g,
    '$1v-if=',
  )

  // 内联错误 AlertStrip（progressHistoryLoadError 等）
  next = next.replace(
    /[ \t]*<UiAlertStrip\r?\n[ \t]*v-if="\w+LoadError"[\s\S]*?<\/UiAlertStrip>\r?\n/g,
    '',
  )
  next = next.replace(
    /[ \t]*<a-alert\r?\n[ \t]*v-if="\w+LoadError"[\s\S]*?\/>[ \t]*\r?\n/g,
    '',
  )

  // loadError 双写：保留 showUserError
  next = next.replace(
    /[ \t]*\w+(?:LoadError|loadError)\.value = toUserError\([^)]+\)\r?\n[ \t]*showUserError\(([^)]+)\)/g,
    '    showUserError($1)',
  )
  next = next.replace(
    /[ \t]*\w+(?:LoadError|loadError)\.value = toUserError\(([^)]+)\)/g,
    (m, args) => `    showUserError(${args})`,
  )

  next = next.replace(/^[ \t]*\w+(?:LoadError|loadError)\.value = null\r?\n/gm, '')
  next = next.replace(/^[ \t]*const \w+(?:LoadError|loadError) = ref(?:<[^>]+>)?\([^)]*\)\r?\n/gm, '')

  // improvement-workbench 等：workbenchLoadError 改为 notify
  next = next.replace(
    /function handleTabLoadError\(error: Error \| null\): void \{\r?\n[ \t]*if \(error !== null\) \{\r?\n[ \t]*workbenchLoadError\.value = error\r?\n[ \t]*\}\r?\n\}/g,
    `function handleTabLoadError(error: Error | null): void {
  if (error !== null) {
    showUserError(error, error.message || '数据加载失败')
  }
}`,
  )

  next = next.replace(
    /if \(!workbenchLoadError\.value\) \{\r?\n[ \t]*handleTabLoadError\(/g,
    'handleTabLoadError(',
  )
  next = next.replace(/\)\r?\n[ \t]*\}\r?\n(\s*\} catch)/g, ')\n$1')

  // SignalBand 孤儿 v-else
  next = next.replace(/<SignalBand v-else /g, '<SignalBand ')

  // MarkingScanMaterialPanel 内联「加载失败」空态改中性文案
  next = next.replace(/description="[^"]*加载失败[^"]*"/g, 'description="暂无数据"')

  if (next.includes('showUserError(') && next.includes('<script')) {
    if (next.includes("@/utils/error-handler")) {
      next = next.replace(/import \{([^}]+)\} from '@\/utils\/error-handler'/g, (m, imp) => {
        const parts = imp.split(',').map((s) => s.trim()).filter(Boolean)
        const filtered = parts.filter((p) => {
          if (p === 'toUserError' && !next.includes('toUserError(')) return false
          return true
        })
        if (!filtered.includes('showUserError') && next.includes('showUserError(')) {
          filtered.push('showUserError')
        }
        return filtered.length ? `import { ${filtered.join(', ')} } from '@/utils/error-handler'` : ''
      })
    } else if (next.match(/<script[^>]*setup/)) {
      next = next.replace(/(<script[^>]*>\r?\n)/, "$1import { showUserError } from '@/utils/error-handler'\r\n")
    }
  }

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
console.log(`Round 4: ${n} files`)
