import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '../..')
const sourceRoot = path.join(projectRoot, 'src')
const registryPath = path.join(import.meta.dirname, 'VUE_FILE_CRAFT_REGISTRY.json')
const componentPath = path.join(import.meta.dirname, 'COMPONENT_CRAFT_AUDIT.json')
const boardPath = path.join(import.meta.dirname, 'craft-board-hi-fi.html')
const oldRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
const oldComponents = JSON.parse(fs.readFileSync(componentPath, 'utf8'))
const oldFileMap = new Map(oldRegistry.files.map((item) => [item.path, item]))
const oldComponentMap = new Map(oldComponents.all.map((item) => [item.path, item]))

const special = {
  'components/portfolio/PortfolioScopeHeader.vue': [
    'P0',
    '统一负责档案袋教师范围和工作壳切换',
    '普通教师固定本人；管理员选择教师后只显示姓名、工号和代办标记，并提供回本人。',
    '页面内重复代办标题、账号归属说明、teacherId 锁定说明或第二组范围指标',
  ],
  'components/portfolio/PortfolioLayoutContext.vue': [
    'P1',
    '只承载全域唯一教师范围条',
    '范围条紧贴应用壳，保持单行、常驻和低视觉权重；未选教师时直接提供选择入口。',
    '扩展成说明卡、身份卡、KPI 条或黄色提示带',
  ],
  'views/portfolio/teacher-home.vue': [
    'P0',
    '负责当前教师的档案状态、真实待办和高频入口',
    '首屏保留完整度、待办与材料采集；审核进度和我的档案降为次操作，低频入口进入导航。',
    '更多入口按钮墙、重复身份、同权数字卡和说教式空态',
  ],
  'components/quality/QualityScopeChrome.vue': [
    'P0',
    '统一负责专业、培养方案、学年学期和课程范围',
    '按专业与培养方案、学年学期、课程排序；方案未确认时阻断评价计算并给出唯一处理动作。',
    '教师代办选择、档案袋身份条或解释 OBE 的长文案',
  ],
  'components/workbench/ContextBar.vue': [
    'P1',
    '统一承载页面标题、必要状态和页面级动作',
    '限制为一个主动作和少量次动作；重复范围信息交给域 Scope 组件。',
    '标题解释、身份解释、阶段解释、KPI 和按钮墙同时堆入',
  ],
  'components/workbench/SignalBand.vue': [
    'P1',
    '只展示可下钻、可行动的少量关键指标',
    '默认紧凑 panel；同页保留三至五个与队列或问题清单相连的指标。',
    '彩点卡片阵列、装饰趋势、粗侧边条和正文重复数字',
  ],
  'layout/components/Menu/DualDomainSideNav.vue': [
    'P0',
    '负责三业务域入口和域内主任务导航',
    '每个工作壳只投影当前角色可办理的主任务；配置和治理进入对应工作壳。',
    '用更多隐藏完整菜单或由前端猜角色拼菜单',
  ],
  'layout/components/Main.vue': [
    'P1',
    '只决定全局滚动面和内容承载层',
    '保持浅色主题与白色工作面，统一页面间距和滚动行为。',
    '整页浮动大卡、第二套灰蓝品牌底色或营销 substrate',
  ],
  'components/mark/MarkingScorePanel.vue': [
    'P1',
    '负责单题给分、满分对照、快捷分和人工确认',
    '保留数值输入精调，常用分与全对全错作为快捷入口；明确满分、步长和提交去向。',
    '强制数字宫格主路径或让 AI 建议自动写分',
  ],
  'components/mark/MarkingBatchScoreDrawer.vue': [
    'P2',
    '负责批量给分的范围核对和后果确认',
    '提交前显示影响答卷数、目标题目和分值；成功后回原队列并刷新。',
    '照搬单题面板或只写确定执行而不说明影响范围',
  ],
  'components/chart/MarkChart.vue': [
    'P1',
    '负责图表容器、空态、加载态和可访问摘要',
    '颜色由业务系列语义和统一图表 token 决定；补齐失败态和文本摘要。',
    '把全部图表机械改成单一蓝阶，丢失警告、达成和偏差语义',
  ],
  'views/portfolio/ai-four-assistants.vue': [
    'P0',
    '负责四类 AI 任务的选择、生成、人工修订和写入',
    '改为任务轨、单一编辑区和历史抽屉；管理员结果必须由教师本人确认后写入。',
    '四个同权 Tab、长表单纵向堆叠、重复范围说明或 AI 自动裁决',
  ],
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return entry.name.endsWith('.vue') ? [fullPath] : []
  })
}

function count(source, pattern) {
  return Array.from(source.matchAll(pattern)).length
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function labels(source) {
  const values = []
  for (const match of source.matchAll(
    /(?:title|description|placeholder|label|empty-title|empty-description)=["']([^"']{2,48})["']/g,
  )) {
    const value = match[1].trim()
    if (/^[\w./:@{}[\]|&?!()\s-]+$/.test(value)) continue
    if (/^(请选择|请输入|请搜索|暂无数据|加载中)$/.test(value)) continue
    values.push(value)
  }
  return unique(values).slice(0, 4)
}

function pageNameFor(filePath, sourceLabels) {
  const preferred = sourceLabels.find((value) => {
    return value.length >= 3 && value.length <= 24 && !/失败|为空|暂无|请选择|请输入/.test(value)
  })
  if (preferred) return preferred
  return path.basename(filePath, '.vue').split(/[-_]/).filter(Boolean).join(' ')
}

function imports(source) {
  return unique(
    Array.from(source.matchAll(/from ["']@\/([^"']+?\.vue)["']/g)).map((match) => {
      return path.basename(match[1], '.vue')
    }),
  ).slice(0, 4)
}

function domainFor(filePath) {
  const old = oldFileMap.get(filePath)
  if (old && old.domain) return old.domain
  if (filePath.startsWith('views/portfolio/')) return 'portfolio'
  if (filePath.startsWith('views/quality/')) return 'quality'
  if (filePath.startsWith('views/teacher/')) return 'teacher'
  if (filePath.startsWith('views/admin/')) return 'admin'
  if (filePath.startsWith('components/portfolio/')) return 'portfolio-comp'
  if (filePath.startsWith('components/quality/')) return 'quality-comp'
  if (filePath.startsWith('components/workbench/')) return 'workbench'
  if (filePath.startsWith('components/mark/')) return 'mark-comp'
  if (filePath.startsWith('components/ui-guide/')) return 'ui-kit'
  if (filePath.startsWith('layout/')) return 'layout'
  return 'other'
}

function surfaceFor(filePath, source) {
  if (filePath.startsWith('layout/')) return '应用壳'
  if (filePath.includes('/ui-guide/ui/')) return '设计系统原语'
  if (filePath.startsWith('components/')) return '共享或局部组件'
  if (/<(?:UiDataTable|a-table)\b/.test(source)) return '台账或队列页'
  if (/<(?:a-form|UiForm|UiField)\b/.test(source)) return '办理或配置页'
  if (/<(?:MarkChart|SignalBand)\b/.test(source)) return '分析或概览页'
  return '业务页面'
}

function genericReview(filePath, source, sourceLabels, metrics) {
  if (filePath.includes('/ui-guide/ui/')) {
    return [
      'P3',
      '负责 ' + path.basename(filePath, '.vue') + ' 原语的跨域一致性',
      metrics.hardColor
        ? '将颜色和交互态收回现有 token，并回归已有调用方。'
        : '保持公开属性和交互语义；只有真实调用方出现同一缺口时才扩展。',
      '为单页私加皮肤、营销外观或第二套兼容组件',
    ]
  }
  const component = oldComponentMap.get(filePath)
  if (component && component.ref_total === 0) {
    return [
      'HOLD',
      '当前静态引用为零，尚不能确认产品职责',
      '核对路由懒加载、动态组件和自动导入；确认无入口后删除。',
      '把零引用直接等同于可删除或虚构未来用途',
    ]
  }
  if (filePath.startsWith('components/')) {
    let action = '保留业务输入输出，视觉和交互从所属工作台原语继承。'
    if (metrics.tables)
      action = '保持筛选、选择、分页和行操作同源；区分加载、空结果、失败和权限不足。'
    else if (metrics.alerts) action = '提示只陈述当前业务事实和一个处理动作，阻断项保持不可关闭。'
    else if (metrics.cards >= 3)
      action = '核对每个容器是否对应真实业务分组；能用标题和留白表达的区域去掉卡片。'
    return [
      'P3',
      '负责 ' + path.basename(filePath, '.vue') + ' 在所属流程中的局部职责',
      action,
      '泛化说明、装饰指标、无合同字段或与父级重复的标题状态',
    ]
  }
  const pageName = pageNameFor(filePath, sourceLabels)
  if (filePath.startsWith('views/portfolio/')) {
    return [
      'P2',
      '负责“' + pageName + '”在当前教师范围内的办理和反馈',
      metrics.tables
        ? '使用全局教师范围查询；将主要待办放入表格或队列，行内只保留当前状态允许的动作。'
        : '使用全局教师范围加载；首屏只保留本任务状态、证据和下一步。',
      '重复身份和代办说明、要求 URL 携带 teacherId 或说明文字长条',
    ]
  }
  if (filePath.startsWith('views/quality/')) {
    return [
      'P2',
      '负责“' + pageName + '”在质量范围内的评价或改进',
      metrics.tables
        ? '沿用专业、培养方案、学期和课程范围；表格围绕证据、评价结果和改进责任组织。'
        : '沿用质量范围和方案确认门禁；按证据、评价结论、改进任务组织。',
      '教师代办范围或用指标卡替代评价证据和改进任务',
    ]
  }
  if (metrics.tables)
    return [
      'P2',
      '负责“' + pageName + '”的查询、办理和结果反馈',
      '筛选与后端分页同源；批量动作跟随选择状态，行操作按业务状态收敛。',
      '装饰 KPI、第二套筛选或解释整张表用途的长文案',
    ]
  if (metrics.cards >= 3)
    return [
      'P1',
      '负责“' + pageName + '”的主任务和状态概览',
      '按主任务重排首屏，只保留可下钻或推动流程的状态。',
      '同权卡片阵列、彩色图标墙和重复数字制造驾驶舱感',
    ]
  return [
    'P3',
    '负责“' + pageName + '”的当前状态和可执行动作',
    '保持现有业务合同，明确动作完成后的去向。',
    '功能说明横幅、伪数据、无后端来源状态或泛化 AI 文案',
  ]
}

function inspect(fullPath) {
  const filePath = path.relative(sourceRoot, fullPath).split(path.sep).join('/')
  const source = fs.readFileSync(fullPath, 'utf8')
  const sourceLabels = labels(source)
  const sourceImports = imports(source)
  const metrics = {
    buttons: count(source, /<(?:UiButton|a-button|button)\b/g),
    cards: count(source, /<(?:UiCard|WorkbenchSurfaceCard|a-card)\b/g),
    tables: count(source, /<(?:UiDataTable|a-table)\b/g),
    alerts: count(source, /<(?:UiAlertStrip|a-alert)\b/g),
    tabs: count(source, /<(?:UiSectionTabs|a-tabs)\b/g),
    hardColor: /#[0-9a-f]{6}/i.test(source),
  }
  const evidence = []
  if (/<StageWorkbenchShell\b/.test(source)) evidence.push('使用工作台壳')
  if (/<ContextBar\b/.test(source)) evidence.push('使用页面上下文栏')
  if (/<SignalBand\b/.test(source)) evidence.push('展示概览指标')
  if (/targetTeacherId|teacherId/.test(source) && filePath.includes('portfolio'))
    evidence.push('读取教师范围')
  if (metrics.tables) evidence.push(metrics.tables + ' 个表格')
  if (metrics.cards >= 3) evidence.push(metrics.cards + ' 个卡片容器')
  if (metrics.buttons >= 6) evidence.push(metrics.buttons + ' 个按钮')
  if (metrics.alerts >= 2) evidence.push(metrics.alerts + ' 条提示')
  if (metrics.tabs >= 2) evidence.push(metrics.tabs + ' 组页签')
  if (/更多入口|更多操作|查看更多/.test(source)) evidence.push('存在更多入口')
  if (/请从(?:顶部|档案袋顶部)教师范围/.test(source)) evidence.push('重复解释教师范围')
  if (/温馨提示|操作将记入|数据 .* 已锁定|无串数/.test(source)) evidence.push('存在说教式说明')
  if (metrics.hardColor) evidence.push('存在硬编码色')
  if (sourceLabels.length) evidence.push('文案：' + sourceLabels.slice(0, 3).join('、'))
  if (sourceImports.length) evidence.push('依赖：' + sourceImports.slice(0, 3).join('、'))
  const review = special[filePath] || genericReview(filePath, source, sourceLabels, metrics)
  return {
    path: filePath,
    domain: domainFor(filePath),
    surface: surfaceFor(filePath, source),
    lines: source.split('\n').length,
    priority: review[0],
    evidence: evidence.length ? evidence : ['无独立视觉信号，按源码职责审查'],
    responsibility: review[1],
    action: review[2],
    avoid: review[3],
    sourceSignals: Object.assign({}, metrics, { labels: sourceLabels, imports: sourceImports }),
  }
}

const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3, HOLD: 4 }
const files = walk(sourceRoot)
  .map(inspect)
  .sort((left, right) => {
    return (
      priorityOrder[left.priority] - priorityOrder[right.priority] ||
      left.path.localeCompare(right.path)
    )
  })
const fileMap = new Map(files.map((item) => [item.path, item]))
const fileSummary = files.reduce(
  (summary, item) => {
    summary.byPriority[item.priority] = (summary.byPriority[item.priority] || 0) + 1
    summary.byDomain[item.domain] = (summary.byDomain[item.domain] || 0) + 1
    return summary
  },
  { total: files.length, byPriority: {}, byDomain: {} },
)

fs.writeFileSync(
  registryPath,
  JSON.stringify(
    {
      meta: {
        method: 'source evidence review',
        skills: [
          'impeccable/product critique',
          'finesse/product audit',
          'taste anti-slop audit-only',
        ],
        implementationGate: 'frontend-design-mark',
        fields: ['evidence', 'responsibility', 'action', 'avoid'],
      },
      summary: fileSummary,
      files,
    },
    null,
    2,
  ) + '\n',
)

const statusOrder = { REWORK: 0, TUNE: 1, DEAD: 2, OK: 3, HOLD: 4 }
const components = oldComponents.all
  .map((component) => {
    const file = fileMap.get(component.path)
    let status = component.status
    if (component.ref_total === 0) status = 'DEAD'
    else if (file.priority === 'P0') status = 'REWORK'
    else if (file.priority === 'P1' && status !== 'REWORK' && status !== 'HOLD') status = 'TUNE'
    else if (status === 'REWORK' && component.issues.join('').includes('维持')) status = 'TUNE'
    return Object.assign({}, component, {
      status,
      issues: [file.action],
      review: {
        evidence: file.evidence,
        responsibility: file.responsibility,
        action: file.action,
        avoid: file.avoid,
        topReferences: component.top_refs,
      },
    })
  })
  .sort((left, right) => {
    return (
      statusOrder[left.status] - statusOrder[right.status] ||
      right.ref_total - left.ref_total ||
      left.path.localeCompare(right.path)
    )
  })
const componentSummary = components.reduce(
  (summary, item) => {
    summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + 1
    return summary
  },
  { totalComponents: components.length, byStatus: {} },
)
const componentMap = new Map(components.map((item) => [item.path, item]))

fs.writeFileSync(
  componentPath,
  JSON.stringify(
    {
      meta: Object.assign({}, oldComponents.meta, {
        method: 'source evidence + reference graph + explicit ownership review',
        fields: ['review.evidence', 'review.responsibility', 'review.action', 'review.avoid'],
      }),
      summary: componentSummary,
      panorama_keys: oldComponents.panorama_keys.map((item) => {
        return componentMap.get(item.path) || item
      }),
      all: components,
      dead: components.filter((item) => {
        return item.status === 'DEAD'
      }),
      rework: components.filter((item) => {
        return item.status === 'REWORK'
      }),
      tune: components.filter((item) => {
        return item.status === 'TUNE'
      }),
      top_used: components
        .slice()
        .sort((left, right) => {
          return right.ref_total - left.ref_total
        })
        .slice(0, 40),
    },
    null,
    2,
  ) + '\n',
)

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function badge(value) {
  if (value === 'P0' || value === 'REWORK') return 'no'
  if (value === 'P1' || value === 'TUNE') return 'warn'
  if (value === 'HOLD') return 'ok'
  return ''
}

function renderFileSection() {
  const rows = files
    .map((item) => {
      const query = [item.path, item.domain, item.surface]
        .concat(item.evidence, [item.responsibility, item.action, item.avoid])
        .join(' ')
      return (
        '<tr data-pri="' +
        item.priority +
        '" data-dom="' +
        escapeHtml(item.domain) +
        '" data-q="' +
        escapeHtml(query) +
        '"><td><span class="chip ' +
        badge(item.priority) +
        '">' +
        item.priority +
        '</span></td><td>' +
        escapeHtml(item.domain) +
        '</td><td>' +
        escapeHtml(item.surface) +
        '</td><td class="audit-path">' +
        escapeHtml(item.path) +
        '</td><td>' +
        escapeHtml(item.evidence.join('；')) +
        '</td><td><b>' +
        escapeHtml(item.responsibility) +
        '</b><br>' +
        escapeHtml(item.action) +
        '<br><span class="audit-avoid">禁：' +
        escapeHtml(item.avoid) +
        '</span></td><td>' +
        item.lines +
        '</td></tr>'
      )
    })
    .join('\n')
  const counts = fileSummary.byPriority
  return (
    '<!-- CRAFT_VUE_REGISTRY_START -->\n' +
    '<style id="craft-reg-css">.audit-sum{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:12px 0}.audit-sum .k{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px}.audit-sum b{display:block;font-size:21px}.audit-rule{padding:12px 14px;margin:12px 0;border:1px solid var(--border);border-radius:8px;background:#fafbfc;font-size:12px;line-height:1.7}.audit-filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.audit-filters input,.audit-filters select{height:32px;border:1px solid #d9d9d9;border-radius:6px;padding:0 10px}.audit-filters input{min-width:280px}.audit-wrap{max-height:680px;overflow:auto;border:1px solid var(--border);border-radius:8px}.audit-table{width:100%;border-collapse:collapse;font-size:12px;background:#fff}.audit-table th,.audit-table td{padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:left;vertical-align:top;line-height:1.5}.audit-table th{position:sticky;top:0;z-index:1;background:#fafbfc}.audit-path{font:11px var(--mono);color:#0958d9;word-break:break-all}.audit-avoid{color:#8c8c8c}@media(max-width:1000px){.audit-sum{grid-template-columns:repeat(2,1fr)}}</style>\n' +
    '<section class="section" id="sec-vuefiles"><div class="sec-head"><div><h2>12 · Vue 文件逐项审查（' +
    files.length +
    '）</h2><p>每条结论来自当前 SFC 的文案、组件依赖和交互信号，不再使用“随父壳继承”等空泛模板。</p></div><div class="chips"><span class="chip no">P0 ' +
    (counts.P0 || 0) +
    '</span><span class="chip warn">P1 ' +
    (counts.P1 || 0) +
    '</span><span class="chip">P2 ' +
    (counts.P2 || 0) +
    '</span><span class="chip ok">HOLD ' +
    (counts.HOLD || 0) +
    '</span></div></div>' +
    '<div class="audit-sum"><div class="k"><b>' +
    files.length +
    '</b><span>Vue 文件</span></div><div class="k"><b>' +
    (counts.P0 || 0) +
    '</b><span>业务和范围必改</span></div><div class="k"><b>' +
    (counts.P1 || 0) +
    '</b><span>主链体验收敛</span></div><div class="k"><b>' +
    components.length +
    '</b><span>组件引用复核</span></div><div class="k"><b>4</b><span>证据 / 归属 / 动作 / 禁改</span></div></div>' +
    '<div class="audit-rule"><strong>去 AI 化门槛：</strong>同一身份只出现一次；同一状态只保留一个真源；说明文字不能替代状态和动作；卡片必须对应实体或业务分组；建议必须指向当前文件或明确的共享组件。TasteSkill 只做 anti-slop 检查。</div>' +
    '<div class="audit-filters"><input id="regSearch" type="search" placeholder="搜索路径、源码证据、动作或禁改项"><select id="regPri"><option value="">全部优先级</option><option>P0</option><option>P1</option><option>P2</option><option>P3</option><option>HOLD</option></select><select id="regDom"><option value="">全部域</option></select><span id="regCount" class="hint"></span></div>' +
    '<div class="audit-wrap"><table class="audit-table" id="regTable"><thead><tr><th>级别</th><th>域</th><th>职责面</th><th>文件</th><th>源码证据</th><th>责任归属与优化动作</th><th>行</th></tr></thead><tbody>' +
    rows +
    '</tbody></table></div>' +
    '<div class="sec-confirm" data-confirm-sec="vuefiles" id="sc-vuefiles"><div class="sc-txt"><b>12 Vue 文件逐项审查</b> · 结论必须可由源码证据复核<br><span class="sc-state">本幕尚未确认</span></div><div class="sc-actions"><button type="button" class="btn primary sc-ok" data-sec="vuefiles">确认本幕</button><button type="button" class="btn sc-revoke" data-sec="vuefiles" hidden>撤销确认</button></div></div></section>' +
    '<script id="craft-reg-js">(function(){const s=document.getElementById("regSearch"),p=document.getElementById("regPri"),d=document.getElementById("regDom"),t=document.getElementById("regTable"),c=document.getElementById("regCount");if(!t||t.dataset.bound==="1")return;t.dataset.bound="1";const r=[...t.querySelectorAll("tbody tr")];[...new Set(r.map(x=>x.dataset.dom))].sort().forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;d.appendChild(o)});function a(){const q=(s.value||"").trim().toLowerCase();let n=0;r.forEach(x=>{const ok=(!p.value||x.dataset.pri===p.value)&&(!d.value||x.dataset.dom===d.value)&&(!q||(x.dataset.q||"").toLowerCase().includes(q));x.style.display=ok?"":"none";if(ok)n++});c.textContent="显示 "+n+" / "+r.length}s.addEventListener("input",a);p.addEventListener("change",a);d.addEventListener("change",a);a()})();</script>\n<!-- CRAFT_VUE_REGISTRY_END -->'
  )
}

function renderComponentSection() {
  const rows = components
    .map((item) => {
      const review = item.review
      const query = [item.path, item.name, item.package]
        .concat(review.evidence, [review.responsibility, review.action, review.avoid])
        .join(' ')
      return (
        '<tr data-status="' +
        item.status +
        '" data-layer="' +
        item.layer +
        '" data-pkg="' +
        escapeHtml(item.package) +
        '" data-q="' +
        escapeHtml(query) +
        '"><td><span class="chip ' +
        badge(item.status) +
        '">' +
        item.status +
        '</span></td><td>' +
        item.layer +
        '</td><td>' +
        escapeHtml(item.package) +
        '</td><td><b>' +
        escapeHtml(item.name) +
        '</b><div class="audit-path">' +
        escapeHtml(item.path) +
        '</div></td><td>' +
        item.ref_total +
        '</td><td>' +
        escapeHtml(review.evidence.join('；')) +
        '</td><td><b>' +
        escapeHtml(review.responsibility) +
        '</b><br>' +
        escapeHtml(review.action) +
        '<br><span class="audit-avoid">禁：' +
        escapeHtml(review.avoid) +
        '</span></td></tr>'
      )
    })
    .join('\n')
  const counts = componentSummary.byStatus
  return (
    '<!-- CRAFT_COMP_AUDIT_START -->\n<section class="section" id="sec-compaudit"><div class="sec-head"><div><h2>14 · 组件逐项审查（' +
    components.length +
    '）</h2><p>引用关系只判断影响面；结论同时核对组件源码、职责边界和调用场景。</p></div><div class="chips"><span class="chip no">REWORK ' +
    (counts.REWORK || 0) +
    '</span><span class="chip warn">TUNE ' +
    (counts.TUNE || 0) +
    '</span><span class="chip">DEAD ' +
    (counts.DEAD || 0) +
    '</span><span class="chip ok">HOLD ' +
    (counts.HOLD || 0) +
    '</span></div></div>' +
    '<div class="audit-sum"><div class="k"><b>' +
    components.length +
    '</b><span>组件</span></div><div class="k"><b>' +
    (counts.REWORK || 0) +
    '</b><span>职责或形态重做</span></div><div class="k"><b>' +
    (counts.TUNE || 0) +
    '</b><span>调用面统一</span></div><div class="k"><b>' +
    (counts.DEAD || 0) +
    '</b><span>零引用待核</span></div><div class="k"><b>' +
    (counts.HOLD || 0) +
    '</b><span>保持合同</span></div></div>' +
    '<div class="audit-rule"><strong>组件门槛：</strong>共享组件解决跨页面重复问题，页面组件只负责业务编排；零引用先核对动态入口；没有真实调用缺口不得扩展设计系统；教师范围、质量范围、考试上下文各自保持单一真源。</div>' +
    '<div class="audit-filters"><input id="compSearch" type="search" placeholder="搜索组件、证据、职责或禁改项"><select id="compStatus"><option value="">全部状态</option><option>REWORK</option><option>TUNE</option><option>DEAD</option><option>OK</option><option>HOLD</option></select><select id="compLayer"><option value="">全部层</option></select><select id="compPkg"><option value="">全部包</option></select><span id="compCount" class="hint"></span></div>' +
    '<div class="audit-wrap"><table class="audit-table" id="compAllTable"><thead><tr><th>状态</th><th>层</th><th>包</th><th>组件</th><th>引用</th><th>源码证据</th><th>责任归属与优化动作</th></tr></thead><tbody>' +
    rows +
    '</tbody></table></div>' +
    '<div class="sec-confirm" data-confirm-sec="compaudit" id="sc-compaudit"><div class="sc-txt"><b>14 组件逐项审查</b> · 删除和扩展前核对引用与职责<br><span class="sc-state">本幕尚未确认</span></div><div class="sc-actions"><button type="button" class="btn primary sc-ok" data-sec="compaudit">确认本幕</button><button type="button" class="btn sc-revoke" data-sec="compaudit" hidden>撤销确认</button></div></div></section>' +
    '<script id="craft-comp-js">(function(){const s=document.getElementById("compSearch"),st=document.getElementById("compStatus"),l=document.getElementById("compLayer"),p=document.getElementById("compPkg"),t=document.getElementById("compAllTable"),c=document.getElementById("compCount");if(!t||t.dataset.bound==="1")return;t.dataset.bound="1";const r=[...t.querySelectorAll("tbody tr")];function f(e,k){[...new Set(r.map(x=>x.dataset[k]))].sort().forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;e.appendChild(o)})}f(l,"layer");f(p,"pkg");function a(){const q=(s.value||"").trim().toLowerCase();let n=0;r.forEach(x=>{const ok=(!st.value||x.dataset.status===st.value)&&(!l.value||x.dataset.layer===l.value)&&(!p.value||x.dataset.pkg===p.value)&&(!q||(x.dataset.q||"").toLowerCase().includes(q));x.style.display=ok?"":"none";if(ok)n++});c.textContent="显示 "+n+" / "+r.length}s.addEventListener("input",a);st.addEventListener("change",a);l.addEventListener("change",a);p.addEventListener("change",a);a()})();</script>\n<!-- CRAFT_COMP_AUDIT_END -->'
  )
}

let board = fs.readFileSync(boardPath, 'utf8')
board = board.replace(
  /<!-- CRAFT_VUE_REGISTRY_START -->[\s\S]*?<!-- CRAFT_VUE_REGISTRY_END -->/,
  renderFileSection(),
)
board = board.replace(
  /<!-- CRAFT_COMP_AUDIT_START -->[\s\S]*?<!-- CRAFT_COMP_AUDIT_END -->/,
  renderComponentSection(),
)
fs.writeFileSync(boardPath, board)

console.warn(JSON.stringify({ files: fileSummary, components: componentSummary }, null, 2))
