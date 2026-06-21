#!/usr/bin/env node
/**
 * 生成 mark-vue 阅卷域页面 + 按钮/操作穷举登记册。
 * 用法：node scripts/generate-mark-ui-inventory.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const markVueRoot = join(fileURLToPath(import.meta.url), '../..')
const repoRoot = join(markVueRoot, '..')
const outPath = join(repoRoot, 'docs/plans/2026-06-21-mark-vue-edu-mark-full-audit-inventory.md')
const apiRegistryPath = join(repoRoot, 'docs/plans/2026-06-04-mark-vue-edu-mark-api-contract-registry.md')

const ROUTE_FILES = [
  'src/router/routes/teacher.ts',
  'src/router/routes/exam-workspace.ts',
  'src/router/routes/admin.ts',
  'src/router/routes/student.ts',
  'src/router/routes/constant.ts',
]

/** 阅卷域 view 根目录（排除 quality） */
const VIEW_ROOTS = [
  'src/views/teacher',
  'src/views/admin',
  'src/views/student',
  'src/views/scanner-kiosk',
  'src/views/common/exam-export-tasks.vue',
]

/** 无路由但存在的 mark 能力页 */
const ORPHAN_VIEWS = [
  { component: 'src/views/teacher/grading-experience-hub.vue', note: '无独立路由，需审查入口' },
]

function walk(dir, ext = '.vue') {
  const out = []
  if (!statSync(dir).isDirectory()) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, ext))
    else if (name.endsWith(ext)) out.push(p)
  }
  return out
}

function parseRoutes() {
  const pages = []
  for (const rel of ROUTE_FILES) {
    const text = readFileSync(join(markVueRoot, rel), 'utf8')
    const domain = rel.replace('src/router/routes/', '').replace('.ts', '')

    // workspaceChild('path', 'Name', () => import('...'), { meta })
    const childRe =
      /workspaceChild\(\s*'([^']+)',\s*'([^']+)',\s*\(\)\s*=>\s*import\('([^']+)'\),\s*\{([^}]+)\}/g
    let m
    while ((m = childRe.exec(text)) !== null) {
      const [, subPath, name, component, metaBlock] = m
      pages.push({
        domain,
        path: `/teacher/exam-workspace/:examId/${subPath}`,
        name,
        component: component.replace('@/', 'src/'),
        roles: extractMeta(metaBlock, 'roles') || 'TEACHER_ROLES',
        title: extractMeta(metaBlock, 'title') || '—',
        markStageKey: extractMeta(metaBlock, 'markStageKey') || '—',
        layoutWide: metaBlock.includes('layoutWide: true'),
        hideInMenu: metaBlock.includes('hideInMenu: true') || true,
      })
    }

    // standard child routes
    const blockRe =
      /\{\s*path:\s*'([^']+)',\s*name:\s*'([^']+)',\s*component:\s*\(\)\s*=>\s*import\('([^']+)'\),\s*meta:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs
    while ((m = blockRe.exec(text)) !== null) {
      const [, subPath, name, component, metaBlock] = m
      if (name === 'TeacherExamWorkspace') continue
      const basePath = inferBasePath(domain, subPath)
      pages.push({
        domain,
        path: basePath,
        name,
        component: component.replace('@/', 'src/'),
        roles: extractMeta(metaBlock, 'roles') || '—',
        title: extractMeta(metaBlock, 'title') || '—',
        markStageKey: extractMeta(metaBlock, 'markStageKey') || '—',
        layoutWide: metaBlock.includes('layoutWide: true'),
        hideInMenu: metaBlock.includes('hideInMenu: true'),
      })
    }
  }
  return pages
}

function inferBasePath(domain, subPath) {
  const bases = {
    teacher: '/teacher',
    admin: '/admin',
    student: '/student',
    constant: '',
    'exam-workspace': '/teacher/exam-workspace/:examId',
  }
  const base = bases[domain] ?? ''
  if (domain === 'constant') {
    if (subPath.startsWith('/')) return subPath
    if (subPath === 'step') return '/scanner-kiosk/step'
    return `/scanner-kiosk/${subPath}`
  }
  return `${base}/${subPath}`.replace(/\/+/g, '/')
}

function extractMeta(block, key) {
  const re = new RegExp(`${key}:\\s*'([^']+)'`)
  const m = block.match(re)
  return m ? m[1] : null
}

function collectViewFiles() {
  const files = new Set()
  for (const root of VIEW_ROOTS) {
    const abs = join(markVueRoot, root)
    if (!statSync(abs).isFile()) {
      for (const f of walk(abs)) files.add(relative(markVueRoot, f))
    } else {
      files.add(root)
    }
  }
  for (const o of ORPHAN_VIEWS) files.add(o.component)
  return [...files].sort()
}

function extractApiImports(scriptText) {
  const apis = new Set()
  const importRe = /import\s+\{([^}]+)\}\s+from\s+['"]@\/apis\/mark\/([^'"]+)['"]/g
  let m
  while ((m = importRe.exec(scriptText)) !== null) {
    const fns = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    for (const fn of fns) apis.add(`${fn} (${m[2]})`)
  }
  const importAllRe = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]@\/apis\/mark\/([^'"]+)['"]/g
  while ((m = importAllRe.exec(scriptText)) !== null) {
    apis.add(`* as ${m[1]} (${m[2]})`)
  }
  return [...apis]
}

function extractActions(vueText, relPath) {
  const actions = []
  const template = vueText.split('<script')[0] || vueText

  // UiButton with @click
  const uiBtnRe = /<UiButton[^>]*@click(?:\.[\w]+)?="([^"]+)"[^>]*>([\s\S]*?)<\/UiButton>/g
  let m
  while ((m = uiBtnRe.exec(template)) !== null) {
    actions.push({
      type: 'UiButton',
      handler: m[1],
      label: stripHtml(m[2]).slice(0, 40) || '—',
    })
  }

  // UiTextAction
  const textActRe = /<UiTextAction[^>]*@click(?:\.[\w]+)?="([^"]+)"[^>]*>([\s\S]*?)<\/UiTextAction>/g
  while ((m = textActRe.exec(template)) !== null) {
    actions.push({
      type: 'UiTextAction',
      handler: m[1],
      label: stripHtml(m[2]).slice(0, 40) || '—',
    })
  }

  // op-link class buttons
  const opLinkRe = /class="[^"]*op-link[^"]*"[^>]*@click(?:\.[\w]+)?="([^"]+)"/g
  while ((m = opLinkRe.exec(template)) !== null) {
    actions.push({ type: 'op-link', handler: m[1], label: '—' })
  }

  // generic @click on button/a (dedupe handlers)
  const clickRe = /(?:<button|<a)[^>]*@click(?:\.[\w]+)?="([^"]+)"/g
  while ((m = clickRe.exec(template)) !== null) {
    if (!actions.some((a) => a.handler === m[1])) {
      actions.push({ type: 'button/a', handler: m[1], label: '—' })
    }
  }

  // GlobalConfirmDialog / confirm handlers in script
  const scriptMatch = vueText.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  const script = scriptMatch ? scriptMatch[1] : ''
  const confirmRe = /(?:GlobalConfirmDialog|UiConfirmDialog|Modal\.confirm)/g
  const hasConfirm = confirmRe.test(vueText)

  const apiImports = extractApiImports(script)

  // map handler to likely API calls in function body
  for (const action of actions) {
    const handlerName = sanitizeHandlerName(action.handler)
    action.apis = findApisInHandler(script, handlerName)
  }

  return { actions, apiImports, hasConfirm, relPath }
}

function sanitizeHandlerName(raw) {
  return raw.replace(/\([^)]*\)/g, '').replace(/[^a-zA-Z0-9_$]/g, '').trim()
}

function findApisInHandler(script, handlerName) {
  const safe = sanitizeHandlerName(handlerName)
  if (!safe) return []
  const escaped = safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const fnRe = new RegExp(
    `(?:async\\s+)?function\\s+${escaped}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)(?=\\n(?:async\\s+)?function\\s|\\nconst\\s|$)`,
  )
  const arrowRe = new RegExp(
    `const\\s+${escaped}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{([\\s\\S]*?)(?=\\n(?:async\\s+)?function\\s|\\nconst\\s|$)`,
  )
  let body = ''
  const fm = script.match(fnRe) || script.match(arrowRe)
  if (fm) body = fm[1]
  const calls = [...body.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/g)].map((x) => x[1])
  return [...new Set(calls)].filter((c) => /^[a-z]/.test(c) && c.length > 3).slice(0, 8)
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function mdTable(rows, cols) {
  const head = `| ${cols.map((c) => c.title).join(' | ')} |`
  const sep = `| ${cols.map(() => '---').join(' | ')} |`
  const body = rows
    .map((r) => `| ${cols.map((c) => String(c.get(r)).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`)
    .join('\n')
  return `${head}\n${sep}\n${body}`
}

const pages = parseRoutes()
const viewFiles = collectViewFiles()
const pageByComponent = new Map(pages.map((p) => [p.component, p]))

const actionRows = []
let actionSeq = 0
for (const rel of viewFiles) {
  const abs = join(markVueRoot, rel)
  if (!statSync(abs).isFile()) continue
  const text = readFileSync(abs, 'utf8')
  const { actions, apiImports, hasConfirm } = extractActions(text, rel)
  const page = pageByComponent.get(rel)
  for (const a of actions) {
    actionSeq++
    actionRows.push({
      seq: actionSeq,
      page: page?.name || '—',
      path: page?.path || '（无路由）',
      view: rel,
      markStage: page?.markStageKey || '—',
      type: a.type,
      label: a.label,
      handler: a.handler,
      apis: a.apis?.join(', ') || '—',
      apiImports: apiImports.join('; ') || '—',
      hasConfirm: hasConfirm ? '页级有确认组件' : '—',
      reviewStatus: '待审查',
      reviewNote: '',
    })
  }
}

const now = new Date().toISOString().slice(0, 10)
const pageRows = pages.map((p, i) => ({
  seq: i + 1,
  domain: p.domain,
  path: p.path,
  name: p.name,
  title: p.title,
  component: p.component,
  markStage: p.markStageKey,
  roles: p.roles,
  layoutWide: p.layoutWide ? '是' : '否',
  hideInMenu: p.hideInMenu ? '是' : '否',
  reviewStatus: '待审查',
}))

const orphanRows = ORPHAN_VIEWS.map((o, i) => ({
  seq: pageRows.length + i + 1,
  domain: 'orphan',
  path: '—',
  name: '—',
  title: o.note,
  component: o.component,
  markStage: '—',
  roles: '—',
  layoutWide: '—',
  hideInMenu: '—',
  reviewStatus: '待审查',
}))

const allPageRows = [...pageRows, ...orphanRows]

const apiRegistryExists = statSync(apiRegistryPath, { throwIfNoEntry: false })
  ? readFileSync(apiRegistryPath, 'utf8').match(/浏览器 \/ SSE 可调用端点 \| (\d+)/)?.[1] ?? '见登记册'
  : '未生成'

const md = `# mark-vue ↔ edu-mark 全量审查穷举登记册

> **生成日期**：${now}  
> **生成命令**：\`node edu-practice-mark-vue/scripts/generate-mark-ui-inventory.mjs\`  
> **范围**：edu-mark 阅卷域 + mark-vue 阅卷相关页面（不含 /quality）  
> **关联 API 登记册**：[2026-06-04-mark-vue-edu-mark-api-contract-registry.md](2026-06-04-mark-vue-edu-mark-api-contract-registry.md)（浏览器/SSE 端点 ${apiRegistryExists} 项）

## §0 审查元数据

| 项 | 值 |
|---|---|
| Skill 链 | mark-deep-review → business-logic-review → frontend-design-mark → feature-review-checklist |
| sequential-thinking 批次 | T1 准备/制卷 → T2 名册 → T3 扫描 → T4 复核轨 → T5 正评轨 → T6 成绩 → T7 复核申诉 → T8 分析归档 → T9 学生/管理/Kiosk |
| 修复原则 | 企业级完整实现；禁止简化、兼容层、silent fallback |

## §1 页面穷举（${allPageRows.length} 项）

${mdTable(allPageRows, [
  { title: '序号', get: (r) => r.seq },
  { title: '域', get: (r) => r.domain },
  { title: '路由 path', get: (r) => `\`${r.path}\`` },
  { title: '路由 name', get: (r) => r.name },
  { title: '菜单标题', get: (r) => r.title },
  { title: '组件', get: (r) => `\`${r.component}\`` },
  { title: 'markStage', get: (r) => r.markStage },
  { title: 'roles', get: (r) => r.roles },
  { title: 'layoutWide', get: (r) => r.layoutWide },
  { title: 'hideInMenu', get: (r) => r.hideInMenu },
  { title: '审查状态', get: (r) => r.reviewStatus },
])}

### §1.1 按 markStage 分组索引

${groupByMarkStage(allPageRows)}

## §2 接口穷举

完整浏览器/SSE/设备端点逐项表见 **[API 契约登记册](2026-06-04-mark-vue-edu-mark-api-contract-registry.md)**。

\`\`\`bash
node edu-practice-mark-vue/scripts/generate-mark-api-registry.mjs
node edu-practice-mark-vue/scripts/mark-api-audit.mjs
\`\`\`

## §3 按钮/操作穷举（${actionRows.length} 项）

${mdTable(actionRows.slice(0, 500), [
  { title: '序号', get: (r) => r.seq },
  { title: '路由 name', get: (r) => r.page },
  { title: '路由 path', get: (r) => `\`${r.path}\`` },
  { title: '视图文件', get: (r) => `\`${r.view}\`` },
  { title: 'markStage', get: (r) => r.markStage },
  { title: '控件', get: (r) => r.type },
  { title: '文案', get: (r) => r.label },
  { title: 'handler', get: (r) => `\`${r.handler}\`` },
  { title: 'handler 内调用', get: (r) => r.apis },
  { title: 'apis/mark 导入', get: (r) => r.apiImports },
  { title: '确认对话框', get: (r) => r.hasConfirm },
  { title: '审查状态', get: (r) => r.reviewStatus },
])}

${actionRows.length > 500 ? `\n> 共 ${actionRows.length} 项操作，上表展示前 500 项；完整列表请重新运行脚本或分页扩展。\n` : ''}

### §3.1 按视图文件分组操作数

${groupActionCounts(actionRows)}

## §4 业务主链状态机

\`\`\`text
EXAM_PREP → PAPER_TEMPLATE → SCAN → MARKING_ORG → TRIAL_MARKING → FORMAL_MARKING
→ SCORE_PUBLISH → GRADE_REVIEW → ARCHIVE
\`\`\`

| 阶段 | 关键页面 | 主 API 簇 |
|------|----------|-----------|
| EXAM_PREP | exam-list, exam-prep-workbench, exam-detail | exams/*, material-layout, scope |
| PAPER_TEMPLATE | paper-template, answer-sheet, paper-master | template/*, standard-answer/* |
| SCAN | scan-upload, scan-live-monitor, image-ledger | scanner-batches/*, image-ledger/*, scan-live |
| MARKING_ORG | marking-organization, review-assignment | organization/* |
| TRIAL_MARKING | marking-task-pool (trial), review-progress | organization/task/* |
| FORMAL_MARKING | marking-task-detail, review-workspace, arbitration | organization/task/*, review-tasks/*, question-grades/* |
| SCORE_PUBLISH | score-finalize, score-publish, absence-confirm | final-scores/*, absence/* |
| GRADE_REVIEW | appeal-handle, student/appeal | grade-review/* |
| ARCHIVE | statistics, archive-list, exam-export-tasks | question-analysis/*, archive/*, export/* |

**双轨批阅（勿混淆）**

| 轨道 | 页面 | API |
|------|------|-----|
| OCR/AI 复核 | review-workspace | /api/mark/exams/review-* , question-grades/* |
| 阅卷组织正评 | marking-task-detail | /api/mark/organization/task/* |

## §5 逐项审查结论

| 序号 | 审查批次 | 审查项 | 严重度 | 结论 | 修复文件 |
|------|----------|--------|--------|------|----------|
| — | — | （审查进行中，逐项填充） | — | — | — |

## §6 修复记录与验证签字

- [ ] §1 ${allPageRows.length} 页面已审查
- [ ] §3 ${actionRows.length} 操作已审查
- [ ] API 登记册已复验（mark-api-audit.mjs 浏览器缺失 = 0）
- [ ] mark-deep-review 铁律通过
- [ ] pnpm typecheck 通过

---

*§1/§3 由 \`generate-mark-ui-inventory.mjs\` 生成；§5/§6 为人工审查与修复记录。*
`

function groupByMarkStage(rows) {
  const groups = new Map()
  for (const r of rows) {
    const k = r.markStage || '—'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(r.name || r.component)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([stage, names]) => `- **${stage}**：${names.filter((n) => n !== '—').join(', ') || '—'}`)
    .join('\n')
}

function groupActionCounts(rows) {
  const counts = new Map()
  for (const r of rows) {
    counts.set(r.view, (counts.get(r.view) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v, c]) => `- \`${v}\`：${c} 项操作`)
    .join('\n')
}

writeFileSync(outPath, md, 'utf8')
console.log(`Wrote ${outPath}`)
console.log(`Pages: ${allPageRows.length}, Actions: ${actionRows.length}`)
