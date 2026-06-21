#!/usr/bin/env node
/**
 * 生成 mark-vue ↔ edu-mark API 契约登记册（Markdown）。
 * 用法：node scripts/generate-mark-api-registry.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const markVueRoot = join(fileURLToPath(import.meta.url), '../..')
const repoRoot = join(markVueRoot, '..')
const ctrlDir = join(repoRoot, 'edu-practice/edu-mark/src/main/java/com/nybc/mark/controller')
const apisDir = join(markVueRoot, 'src/apis/mark')
const callSiteRoots = [
  { dir: join(markVueRoot, 'src/views'), layer: 'view' },
  { dir: join(markVueRoot, 'src/components'), layer: 'component' },
  { dir: join(markVueRoot, 'src/composables'), layer: 'composable' },
  { dir: join(markVueRoot, 'src/stores'), layer: 'store' },
]
const outPath = join(repoRoot, 'docs/plans/2026-06-04-mark-vue-edu-mark-api-contract-registry.md')

/** 前端仅封装、由后端 worker/调度器调用的端点（浏览器主链不直接调用） */
const WORKER_ONLY_PATHS = new Set([
  '/api/mark/exams/export/start',
  '/api/mark/exams/export/complete',
  '/api/mark/exams/export/fail',
])

/** 人工审查备注：路径 → 说明 */
const MANUAL_REVIEW_NOTES = {
  '/api/mark/exams/export/detail': '导出任务页 list + getExportTask 轮询深查',
  '/api/mark/ocr/config/save': '平台超管在 web-vue 配置；mark-vue ocr-settings 只读',
  '/api/mark/ocr/paddle/instance/register': '平台运维注册 Paddle 实例；mark-vue 只读展示列表',
  '/api/exam/question-analysis/answer-effective/get': 'paper-template 预览/编辑弹窗已接线',
}

const DEVICE_PREFIXES = [
  '/api/mark/scanner-push',
  '/api/mark/scanner-agent',
  '/api/mark/exams/scanned-pages',
  '/api/mark/exams/scan-sources',
  '/api/mark/exams/recognition/',
  '/api/internal/',
]
const WEBHOOK_PATHS = new Set(['/api/exam/teaching-affairs/passback/callback'])

function walk(dir, ext = null) {
  const out = []
  if (!statSync(dir).isDirectory()) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, ext))
    else if (!ext || name.endsWith(ext)) out.push(p)
  }
  return out
}

function classifyChannel(path) {
  if (WEBHOOK_PATHS.has(path)) return 'webhook'
  if (DEVICE_PREFIXES.some((p) => path.startsWith(p))) return 'device'
  if (path.includes('/sse/')) return 'sse'
  return 'browser'
}

function parseBackend() {
  const endpoints = []
  for (const name of readdirSync(ctrlDir)) {
    if (!name.endsWith('.java') || name.includes('internal')) continue
    const text = readFileSync(join(ctrlDir, name), 'utf8')
    const baseMatch = text.match(/@RequestMapping\("([^"]+)"\)/)
    if (!baseMatch || baseMatch[1].includes('/internal/')) continue
    const prefix = baseMatch[1].replace(/\/$/, '')
    const controller = name.replace('.java', '')
    const blocks = text.split(/@(Post|Get)Mapping/)
    for (let i = 1; i < blocks.length; i += 2) {
      const method = blocks[i].toUpperCase()
      const block = blocks[i + 1] || ''
      const pathMatch = block.match(/(?:value\s*=\s*)?"([^"]+)"/)
      if (!pathMatch) continue
      const sub = pathMatch[1]
      const path = sub.startsWith('/') ? prefix + sub : `${prefix}/${sub}`
      const opMatch = block.match(/@Operation\([^)]*summary\s*=\s*"([^"]+)"/)
      const summary = opMatch ? opMatch[1] : ''
      endpoints.push({ method, path, controller, summary })
    }
  }
  endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
  return endpoints
}

function parseFrontendApis() {
  /** path -> { functions: Set, files: Set } */
  const byPath = new Map()
  const fnToPath = new Map()

  for (const file of walk(apisDir, '.ts')) {
    if (file.endsWith('scanner-agent-local.ts')) continue
    const text = readFileSync(file, 'utf8')
    const rel = relative(markVueRoot, file)
    const fnRegex = /export\s+(?:async\s+)?function\s+(\w+)/g
    const fns = [...text.matchAll(fnRegex)].map((m) => m[1])

    const pathHits = [...text.matchAll(/['"`](\/api\/[^'"`?]+)/g)].map((m) => m[1])
    const fnBlocks = text.split(/export\s+(?:async\s+)?function\s+\w+/)
    let fnIdx = 0
    for (const fn of fns) {
      const block = fnBlocks[fnIdx + 1] || text
      fnIdx++
      const pathsInFn = [...block.matchAll(/['"`](\/api\/[^'"`?]+)/g)].map((m) => m[1])
      for (const p of pathsInFn) {
        if (!byPath.has(p)) byPath.set(p, { functions: new Set(), files: new Set() })
        byPath.get(p).functions.add(fn)
        byPath.get(p).files.add(rel)
        fnToPath.set(fn, p)
      }
    }
    // 分页包装函数（如 listTrialSessions → pageTrialSessions）继承同路径登记
    fnIdx = 0
    for (const fn of fns) {
      const block = fnBlocks[fnIdx + 1] || text
      fnIdx++
      if (fnToPath.has(fn)) continue
      for (const callee of fns) {
        if (callee === fn) continue
        if (!fnToPath.has(callee)) continue
        if (!new RegExp(`\\b${callee}\\s*\\(`).test(block)) continue
        const path = fnToPath.get(callee)
        if (!byPath.has(path)) byPath.set(path, { functions: new Set(), files: new Set() })
        byPath.get(path).functions.add(fn)
        byPath.get(path).files.add(rel)
        fnToPath.set(fn, path)
        break
      }
    }
    for (const p of pathHits) {
      if (!byPath.has(p)) byPath.set(p, { functions: new Set(), files: new Set() })
      byPath.get(p).files.add(rel)
    }
    // SSE subscribe in scan-live.ts
    if (text.includes('sse/scan-live/subscribe')) {
      const p = '/api/mark/sse/scan-live/subscribe'
      if (!byPath.has(p)) byPath.set(p, { functions: new Set(), files: new Set() })
      byPath.get(p).files.add(rel)
      if (text.includes('subscribeScanLive')) byPath.get(p).functions.add('subscribeScanLive')
    }
  }
  return { byPath, fnToPath }
}

function buildCallSiteIndex() {
  const files = []
  for (const { dir, layer } of callSiteRoots) {
    if (!statSync(dir).isDirectory()) continue
    for (const f of [...walk(dir, '.vue'), ...walk(dir, '.ts')]) {
      if (f.includes('/apis/mark/')) continue
      files.push({
        path: relative(markVueRoot, f),
        layer,
        text: readFileSync(f, 'utf8'),
      })
    }
  }
  return files
}

function findCallSites(fnNames, callSiteIndex) {
  const views = new Set()
  const indirect = new Set()
  for (const fn of fnNames) {
    const re = new RegExp(`\\b${fn}\\b`)
    for (const f of callSiteIndex) {
      if (!re.test(f.text)) continue
      if (f.layer === 'view') views.add(f.path)
      else indirect.add(`${f.layer}:${f.path}`)
    }
  }
  return { views: [...views].sort(), indirect: [...indirect].sort() }
}

function matchFrontend(path, byPath) {
  if (byPath.has(path)) return byPath.get(path)
  for (const [p, meta] of byPath) {
    if (path.startsWith(p + '/') || path === p) return meta
  }
  return null
}

function integrationStatus(channel, feMeta, views, indirect, path) {
  if (channel === 'device' || channel === 'webhook') return '不适用（非浏览器）'
  if (!feMeta || feMeta.functions.size === 0) {
    if (channel === 'sse') return feMeta ? 'API已声明' : '缺失'
    return '缺失'
  }
  if (WORKER_ONLY_PATHS.has(path)) return 'API已声明·后端 worker 专用'
  if (views.length > 0) return 'API+页面已接线'
  if (indirect.length > 0) return 'API+组件/状态层已接线'
  return 'API已声明·无业务调用'
}

const backend = parseBackend()
const { byPath } = parseFrontendApis()
const callSiteIndex = buildCallSiteIndex()

const browserEps = []
const deviceEps = []
const webhookEps = []

for (const ep of backend) {
  const channel = classifyChannel(ep.path)
  const fe = matchFrontend(ep.path, byPath)
  const fnList = fe ? [...fe.functions] : []
  const { views, indirect } = findCallSites(fnList, callSiteIndex)
  const files = fe ? [...fe.files] : []
  const row = {
    ...ep,
    channel,
    feFunctions: fnList,
    feFiles: files,
    views,
    indirect,
    reviewNote: MANUAL_REVIEW_NOTES[ep.path] || '',
    integration: integrationStatus(channel, fe, views, indirect, ep.path),
  }
  if (channel === 'browser' || channel === 'sse') browserEps.push(row)
  else if (channel === 'device') deviceEps.push(row)
  else webhookEps.push(row)
}

const wiredView = browserEps.filter((r) => r.integration === 'API+页面已接线')
const wiredIndirect = browserEps.filter((r) => r.integration === 'API+组件/状态层已接线')
const workerOnly = browserEps.filter((r) => r.integration === 'API已声明·后端 worker 专用')
const noCaller = browserEps.filter((r) => r.integration === 'API已声明·无业务调用')
const missing = browserEps.filter((r) => r.integration === '缺失')

const now = new Date().toISOString().slice(0, 10)

function mdTable(rows, cols) {
  const head = `| ${cols.map((c) => c.title).join(' | ')} |`
  const sep = `| ${cols.map(() => '---').join(' | ')} |`
  const body = rows
    .map((r) => `| ${cols.map((c) => String(c.get(r)).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`)
    .join('\n')
  return `${head}\n${sep}\n${body}`
}

function formatNoCallerSection(rows) {
  if (!rows.length) return '- （无）'
  return rows.map((r) => {
    const note = r.reviewNote ? ` — ${r.reviewNote}` : ''
    return `- \`${r.method} ${r.path}\` → \`${r.feFunctions.join(', ') || '?'}\`（${r.controller}）${note}`
  }).join('\n')
}

const registryRows = browserEps.map((r, idx) => ({
  seq: idx + 1,
  method: r.method,
  path: r.path,
  controller: r.controller,
  summary: r.summary || '—',
  feFn: r.feFunctions.join(', ') || '—',
  feFile: r.feFiles.map((f) => `\`${f}\``).join('<br>') || '—',
  views: r.views.map((v) => `\`${v}\``).join('<br>') || '—',
  indirect:
    r.indirect.map((v) => `\`${v}\``).join('<br>') || (r.reviewNote ? `—（${r.reviewNote}）` : '—'),
  status: r.integration,
}))

const noCallerSection = formatNoCallerSection(noCaller)

const md = `# mark-vue ↔ edu-mark API 契约登记册

> **生成日期**：${now}  
> **生成命令**：\`node edu-practice-mark-vue/scripts/generate-mark-api-registry.mjs\`  
> **范围**：\`edu-practice-mark-vue/src/apis/mark/**\` ↔ \`edu-mark\` 公开 Controller（不含 \`/api/internal/**\`）  
> **用途**：逐项审查路径、HTTP 方法、前端封装、页面接线与业务流程覆盖；登记册由脚本生成，审查结论见下文人工章节。

## 1. 统计摘要

| 指标 | 数量 |
|------|------|
| 后端 Controller 端点总数 | ${backend.length} |
| 浏览器 / SSE 可调用端点 | ${browserEps.length} |
| 设备 / Agent / 识别内部端点 | ${deviceEps.length} |
| Webhook 端点 | ${webhookEps.length} |
| 前端 \`apis/mark\` 独立路径数 | ${byPath.size} |
| **API + 页面已接线** | ${wiredView.length} |
| **API + 组件/状态层已接线** | ${wiredIndirect.length} |
| **API 已声明·后端 worker 专用** | ${workerOnly.length} |
| **API 已声明·无业务调用** | ${noCaller.length} |
| **浏览器端 API 缺失** | ${missing.length} |

### 1.1 通道划分（业务审查口径）

| 通道 | 说明 | 数量 |
|------|------|------|
| browser | 教师 / 学生 / 管理员浏览器主链 | ${browserEps.filter((r) => r.channel === 'browser').length} |
| sse | \`EventSource\` 扫描实况订阅 | ${browserEps.filter((r) => r.channel === 'sse').length} |
| device | 扫描 Agent、scanner-push、识别回调；不要求 mark-vue 封装 | ${deviceEps.length} |
| webhook | 教务回传外部回调 | ${webhookEps.length} |

## 2. 业务流程与页面对照（审查结论）

以下为主链 **业务状态机 + 前端路由 + API 簇** 对照，用于逻辑审查（非逐字段 DTO 审查）。

### 2.1 考试生命周期

\`\`\`text
创建考试 → 制卷形态/模板 → 考生名册 → 扫描录入 → OCR/识别 → 复核工作台 → 阅卷组织/正评
→ 成绩确认/发布 → 考后归档 → CLOSED
\`\`\`

| 阶段 | 关键路由（teacher） | 主 API 簇 | 逻辑审查结论 |
|------|---------------------|-----------|----------------|
| 考试工作台 | \`TeacherExamList\` | \`exams/page\`、\`marking-progress/batch\`、\`close\` | 批量进度已接；**关闭考试**仅创建人可见（2026-06-04 已接 \`closeExam\`） |
| 考试准备 | \`TeacherExamPrepWorkbench\` | \`material-layout/save\`、\`detail\` | 与 \`markStage\` 阶段条联动；准备项 warning 不阻断扫描 |
| 名册 | \`TeacherCandidateRoster\` | \`scope/*\` 增量 + \`scope/save\` 全量 | 增量为主；**全量保存**用于一次性对齐（扫描锁定后慎用） |
| 关闭 | — | \`exams/close\` | 与删除不同；CLOSED 后操作列隐藏编辑/关闭 |

### 2.2 扫描与影像

| 阶段 | 路由 | API 簇 | 逻辑审查结论 |
|------|------|--------|----------------|
| 扫描上传 | \`TeacherScanUpload\` 等 | \`scanner-batches/*\`、\`papers/bind\` | 主链 |
| 一体机 | \`/scanner-kiosk/*\` | \`scanner/kiosk/*\` | 独立布局；push token |
| 实况 | \`TeacherScanLiveMonitor\` | SSE \`subscribe\` + \`scan-live/recent\` | 经 \`useScanLiveStream\` composable 接线，非页面直调 |
| 影像账本 | \`TeacherImageLedger\` | \`image-ledger/*\`、\`binding/*\` | 重复页绑定 |
| 设备推送 | — | \`scanner-push/*\`、\`scanned-pages/register\` | **设备通道**，浏览器不封装 |

### 2.3 双轨批阅（勿混淆）

| 轨道 | 页面 | API 前缀 | 业务语义 |
|------|------|----------|----------|
| **Grade Review 复核** | \`review-workspace.vue\` | \`/api/mark/exams/review-*\` | OCR 后 AI 建议；教师确认 \`teacherReviewScore\` |
| **阅卷组织正评** | \`marking-task-pool\` / \`marking-task-detail\` | \`/api/mark/organization/task/*\` | \`markTask\` Store 封装 claim/list/context；详情页 \`RevealAnonymousModal\` |
| **分派方案** | \`review-assignment.vue\` | \`organization/allocation/*\` | 创建人编辑；协作者只读 \`getOrganization\`（2026-06-04） |

### 2.4 成绩、复核、分析

| 能力 | 路由/API | 审查结论 |
|------|----------|----------|
| 成绩确认发布 | \`score-finalize\` / \`score-publish\` | \`final-scores/*\` 两步 |
| 学生成绩复核 | \`appeal-handle\`、\`grade-review/*\` | 窗口 activate/close 已封装 |
| 题目质量/重判 | \`statistics/*\` | \`question-analysis/*\`；保存答案勾选生效时 \`confirmAnswerEffective\` 可触发重判计划 |
| 错题本 | \`student/score-detail\` | \`wrong-book\`（2026-06-04 学生端已接） |
| 教学/跨考/校级分析 | admin/teacher 分析页 | \`/api/exam/teaching-analysis\` 等 |

### 2.5 接线分层（脚本扫描 \`views/components/composables/stores\`）

| 分层 | 数量 | 说明 |
|------|------|------|
| 页面直调 | ${wiredView.length} | \`src/views/**\` 内出现 API 函数名 |
| 组件/状态层 | ${wiredIndirect.length} | Store、Composable、\`src/components/**\` 间接接线 |
| 后端 worker 专用 | ${workerOnly.length} | 浏览器不调用；见 \`exam-export.ts\` 注释 |
| 无业务调用 | ${noCaller.length} | 仅 \`apis/mark\` 声明，需补 UI 或删封装 |

#### 2.5.1 无业务调用（${noCaller.length} 项，优先补页面）

${noCallerSection}

#### 2.5.2 后端 worker 专用（${workerOnly.length} 项）

${workerOnly.map((r) => `- \`${r.method} ${r.path}\` → \`${r.feFunctions.join(', ')}\`（导出状态机，由 edu-mark 调度器调用）`).join('\n')}

#### 2.5.3 组件/状态层已接线、页面未直调（${wiredIndirect.length} 项）

完整列表见第 3 节「接线状态 = API+组件/状态层已接线」；典型：\`markTask\` Store（正评任务）、\`useScanLiveStream\`（扫描实况）、\`useKioskWorkflow\`（一体机）、\`ClassStudentTreeSelectorDrawer\`（名册树）。

### 2.6 业务流程风险登记（人工）

| 编号 | 风险 | 级别 | 说明 |
|------|------|------|------|
| B-01 | 答案立即生效 + 重判 | 中 | \`paper-template\` 勾选立即生效会调 \`confirmAnswerEffective\`，已有批改结果时后端创建重判计划 |
| B-02 | 名册全量保存 | 中 | \`saveExamScope\` 覆盖增量编辑；扫描开始后可能失败 |
| B-03 | 关闭考试权限 | 低 | 仅 \`createUser\` 可关闭；与协作只读口径一致 |
| B-04 | 考试列表管理员视角 | 低 | \`pageExams\` 的 \`createUserId\` 教师侧由后端切面注入，前端传值被忽略 |
| B-05 | 双轨批阅入口 | 中 | 菜单已收敛但新人仍易混淆 review-workspace 与 marking-task-pool |

## 3. 浏览器端 API 逐项登记（${browserEps.length} 项）

${mdTable(registryRows, [
  { title: '序号', get: (r) => r.seq },
  { title: '方法', get: (r) => r.method },
  { title: '路径', get: (r) => r.path },
  { title: 'Controller', get: (r) => r.controller },
  { title: '后端摘要', get: (r) => r.summary },
  { title: '前端函数', get: (r) => r.feFn },
  { title: 'apis 文件', get: (r) => r.feFile },
  { title: '引用页面', get: (r) => r.views },
  { title: '间接调用', get: (r) => r.indirect },
  { title: '接线状态', get: (r) => r.status },
])}

## 4. 设备 / Agent / 识别链端点（${deviceEps.length} 项）

${mdTable(
  deviceEps.map((r, i) => ({
    seq: i + 1,
    method: r.method,
    path: r.path,
    controller: r.controller,
    summary: r.summary || '—',
    note: '扫描仪 HTTP 推送 / 本地 Agent / 识别管线内部调用',
  })),
  [
    { title: '序号', get: (r) => r.seq },
    { title: '方法', get: (r) => r.method },
    { title: '路径', get: (r) => r.path },
    { title: 'Controller', get: (r) => r.controller },
    { title: '摘要', get: (r) => r.summary },
    { title: '说明', get: (r) => r.note },
  ],
)}

## 5. Webhook（${webhookEps.length} 项）

${mdTable(
  webhookEps.map((r, i) => ({
    seq: i + 1,
    method: r.method,
    path: r.path,
    summary: r.summary || '—',
    note: '教务系统回调，非 mark-vue 调用',
  })),
  [
    { title: '序号', get: (r) => r.seq },
    { title: '方法', get: (r) => r.method },
    { title: '路径', get: (r) => r.path },
    { title: '摘要', get: (r) => r.summary },
    { title: '说明', get: (r) => r.note },
  ],
)}

## 6. 按 Controller 分组索引

${[...new Set(browserEps.map((r) => r.controller))].sort().map((c) => {
  const items = browserEps.filter((r) => r.controller === c)
  return `### ${c}（${items.length}）\n\n${items.map((r) => `- \`${r.method} ${r.path}\` — ${r.integration}`).join('\n')}`
}).join('\n\n')}

## 7. 按 apis/mark 文件分组索引

${(() => {
  const byFile = new Map()
  for (const r of browserEps) {
    for (const f of r.feFiles.length ? r.feFiles : ['—']) {
      if (!byFile.has(f)) byFile.set(f, [])
      byFile.get(f).push(r)
    }
  }
  return [...byFile.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([f, items]) => `### \`${f}\`（${items.length} 路径关联）\n\n${items.map((r) => `- \`${r.method} ${r.path}\``).join('\n')}`)
    .join('\n\n')
})()}

## 8. 维护与复验

\`\`\`bash
# 路径级对账（CI 可挂）
node edu-practice-mark-vue/scripts/mark-api-audit.mjs

# 生成本登记册
node edu-practice-mark-vue/scripts/generate-mark-api-registry.mjs

# 类型检查
pnpm --dir edu-practice-mark-vue typecheck
\`\`\`

### 8.1 审查签字项（人工勾选）

- [ ] ${browserEps.length} 项浏览器/SSE 端点与网关 \`/api/mark/**\`、\`/api/exam/**\` 路由一致
- [ ] 「无业务调用」${noCaller.length} 项已确认补 UI 或删封装
- [ ] 「worker 专用」${workerOnly.length} 项未误接到 axios 轮询
- [ ] 双轨批阅（复核 vs 阅卷组织）培训材料与菜单文案一致
- [ ] 协作只读（名册/分派/组织）与 \`createUser\` 守卫一致
- [ ] 设备通道未误暴露到浏览器 axios 拦截器

---

*本文件由 \`generate-mark-api-registry.mjs\` 自动生成；修改对接后请重新运行脚本更新第 3 节表格。*
`

writeFileSync(outPath, md, 'utf8')
