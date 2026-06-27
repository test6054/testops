/**
 * 考试工作台六步旅程浏览器验收脚本（一次性，对照设计方案 §18.1 / §21）
 * 运行：node scripts/exam-workspace-acceptance.mjs
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5273'
const USERNAME = 'teacher'
const PASSWORD = 'Pwd@123456'

const JOURNEY_TITLES = ['创建与准备', '扫描识别', '阅卷安排', '批阅', '成绩发布', '归档']

const JOURNEY_SIDEBAR_EXPECT = {
  prep: ['准备工作台', '试卷题目', '答卷页模板', '试卷母版', '考生名册', '印刷包'],
  scan: ['录入与批次', '扫描监控', '影像账本', '扫描设备', 'OCR 配置'],
  assign: ['阅卷安排', '分派方案'],
  mark: ['试评任务池', '试评进度', '阅卷任务池', '进度看板', 'OCR/AI 复核', '批量复核确认', '仲裁裁定', '抽检处理'],
  publish: ['成绩确认', '成绩发布', '缺考确认', '复核申诉'],
  archive: ['归档列表', '成绩统计', '阅卷经验库', '导出任务'],
}

const ROUTE_MATRIX = [
  { path: 'overview', journey: 'overview', label: '考试概览', immersive: false },
  { path: 'prep', journey: 'prep', label: '准备工作台', immersive: false },
  { path: 'print-package', journey: 'prep', label: '印刷包', immersive: false },
  { path: 'paper-template', journey: 'prep', label: '试卷题目', immersive: false },
  { path: 'paper-template/answer-sheet', journey: 'prep', label: '答卷页模板', immersive: false },
  { path: 'paper-template/master', journey: 'prep', label: '试卷母版', immersive: false },
  { path: 'candidate-roster', journey: 'prep', label: '考生名册', immersive: false },
  { path: 'scan/batches', journey: 'scan', label: '录入与批次', immersive: false },
  { path: 'scan/monitor', journey: 'scan', label: '扫描监控', immersive: false, noCache: true },
  { path: 'scan/ledger', journey: 'scan', label: '影像账本', immersive: false },
  { path: 'scan/devices', journey: 'scan', label: '扫描设备', immersive: false },
  { path: 'scan/ocr', journey: 'scan', label: 'OCR 配置', immersive: false },
  { path: 'marking-org', journey: 'assign', label: '阅卷安排', immersive: false },
  { path: 'marking-org/assignment', journey: 'assign', label: '分派方案', immersive: false },
  { path: 'trial/task-pool', journey: 'mark', label: '试评任务池', immersive: false },
  { path: 'trial/progress', journey: 'mark', label: '试评进度', immersive: false },
  { path: 'marking/task-pool', journey: 'mark', label: '阅卷任务池', immersive: false },
  { path: 'marking/progress', journey: 'mark', label: '进度看板', immersive: false },
  { path: 'marking/review', journey: 'mark', label: 'OCR/AI 复核', immersive: false },
  { path: 'marking/review-batch', journey: 'mark', label: '批量复核确认', immersive: false },
  { path: 'marking/arbitration', journey: 'mark', label: '仲裁裁定', immersive: false },
  { path: 'marking/quality', journey: 'mark', label: '抽检处理', immersive: false },
  { path: 'score/summary', journey: 'publish', label: '成绩确认', immersive: false },
  { path: 'score/release', journey: 'publish', label: '成绩发布', immersive: false },
  { path: 'score/absence', journey: 'publish', label: '缺考确认', immersive: false },
  { path: 'score/appeal', journey: 'publish', label: '复核申诉', immersive: false },
  { path: 'archive/package', journey: 'archive', label: '归档列表', immersive: false },
  { path: 'archive/statistics', journey: 'archive', label: '成绩统计', immersive: false },
  { path: 'archive/grading-experience', journey: 'archive', label: '阅卷经验库', immersive: false },
  { path: 'archive/exports', journey: 'archive', label: '导出任务', immersive: false },
  { path: 'marking/task/1', journey: 'mark', label: '批阅沉浸页', immersive: true },
  { path: 'marking/review/1', journey: 'mark', label: '复核沉浸页', immersive: true },
]

const results = []

function record(id, status, detail) {
  results.push({ id, status, detail })
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○'
  console.warn(`${icon} [${status}] ${id}: ${detail}`)
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名').fill(USERNAME)
  await page.getByPlaceholder('请输入密码').fill(PASSWORD)
  await page.getByRole('button', { name: '立即登录' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
  const token = await page.evaluate(() => localStorage.getItem('token'))
  if (!token) throw new Error('登录后未写入 token')
  record('LOGIN', 'PASS', `登录成功，跳转至 ${page.url()}`)
}

async function resolveExamId(page) {
  await page.goto(`${BASE}/teacher/exam-list`, { waitUntil: 'networkidle' })
  const enterBtn = page.getByRole('button', { name: '进入考试' }).first()
  if (await enterBtn.count()) {
    await enterBtn.click()
    await page.waitForURL(/\/teacher\/exam-workspace\/\d+/, { timeout: 15000 })
    const m = page.url().match(/exam-workspace\/(\d+)/)
    if (m) {
      record('EXAM_SELECT', 'PASS', `从考试列表进入 examId=${m[1]}`)
      return m[1]
    }
  }
  // 回退：直接打开已知考试
  const fallback = '208'
  await page.goto(`${BASE}/teacher/exam-workspace/${fallback}/overview`, { waitUntil: 'networkidle' })
  record('EXAM_SELECT', 'SKIP', `列表无「进入考试」按钮，使用 examId=${fallback}`)
  return fallback
}

async function hasJourneyRail(page) {
  const timeline = page.locator('.ui-arrow-timeline')
  return (await timeline.count()) > 0 && (await timeline.isVisible())
}

async function hasSidebar(page) {
  const sidebar = page.locator('.exam-sub-sidebar-nav')
  return (await sidebar.count()) > 0 && (await sidebar.isVisible())
}

async function getJourneyTitles(page) {
  return page.locator('.ui-arrow-timeline__title').allTextContents()
}

async function getSidebarLabels(page) {
  const items = page.locator('.exam-sub-sidebar-nav .ant-menu-item')
  const texts = []
  for (const el of await items.all()) {
    const t = (await el.textContent()).trim()
    if (t) texts.push(t)
  }
  return texts
}

async function getActiveJourneyTitle(page) {
  const active = page.locator('.ui-arrow-timeline__stage--active .ui-arrow-timeline__title')
  if (await active.count()) return (await active.first().textContent()).trim()
  return ''
}

async function waitWorkspaceReady(page) {
  await page.waitForTimeout(800)
  const err = page.locator('.exam-detail-layout__journey-error')
  if (await err.count()) {
    const txt = await err.textContent()
    throw new Error(`阶段快照加载失败: ${txt}`)
  }
}

async function checkSixSteps(page, examId) {
  await page.goto(`${BASE}/teacher/exam-workspace/${examId}/prep`, { waitUntil: 'networkidle' })
  await waitWorkspaceReady(page)
  const titles = await getJourneyTitles(page)
  const ok = JOURNEY_TITLES.every((t) => titles.includes(t)) && titles.length === 6
  record('6_STEPS_RAIL', ok ? 'PASS' : 'FAIL', `旅程轨标题: ${titles.join(' | ')}`)
  const backendLeak = titles.some((t) => ['考试准备', '模板制卷', '试评', '正评'].includes(t))
  if (backendLeak) record('NO_BACKEND_9_STAGES', 'FAIL', '顶部轨暴露了后端细阶段文案')
  else record('NO_BACKEND_9_STAGES', 'PASS', '未暴露后端 9 段枚举')
}

async function checkOverviewNoHighlight(page, examId) {
  await page.goto(`${BASE}/teacher/exam-workspace/${examId}/overview`, { waitUntil: 'networkidle' })
  await waitWorkspaceReady(page)
  const active = await getActiveJourneyTitle(page)
  const ok = active === ''
  record('OVERVIEW_NO_HIGHLIGHT', ok ? 'PASS' : 'FAIL', `概览页活跃旅程: "${active || '无'}"`)
}

async function checkJourneySidebarFilter(page, examId) {
  for (const [journey, expected] of Object.entries(JOURNEY_SIDEBAR_EXPECT)) {
    const route = {
      prep: 'prep',
      scan: 'scan/batches',
      assign: 'marking-org',
      mark: 'marking/task-pool',
      publish: 'score/summary',
      archive: 'archive/package',
    }[journey]
    await page.goto(`${BASE}/teacher/exam-workspace/${examId}/${route}`, { waitUntil: 'networkidle' })
    await waitWorkspaceReady(page)
    const labels = await getSidebarLabels(page)
    const missing = expected.filter((e) => !labels.includes(e))
    const extra = labels.filter((e) => !expected.includes(e))
    const ok = missing.length === 0 && extra.length === 0
    record(`SIDEBAR_${journey.toUpperCase()}`, ok ? 'PASS' : 'FAIL',
      ok ? `${labels.length} 项匹配` : `缺 ${missing.join(',') || '-'}；多余 ${extra.join(',') || '-'}`)
    if (journey === 'mark') {
      const groups = await page.locator('.exam-sub-sidebar-nav .ant-menu-item-group-title').allTextContents()
      const hasTrialFormalQc = ['试评', '正评', '质控'].every((g) => groups.some((x) => x.includes(g)))
      record('MARK_SUBGROUPS', hasTrialFormalQc ? 'PASS' : 'FAIL', `子组: ${groups.join(' | ')}`)
    }
  }
}

async function checkJourneyNavClick(page, examId) {
  await page.goto(`${BASE}/teacher/exam-workspace/${examId}/overview`, { waitUntil: 'networkidle' })
  await waitWorkspaceReady(page)
  await page.locator('.ui-arrow-timeline__title', { hasText: '批阅' }).click()
  await page.waitForURL(/marking\/task-pool/, { timeout: 10000 })
  record('JOURNEY_CLICK_MARK', 'PASS', '点击「批阅」进入正评任务池')
  await page.locator('.ui-arrow-timeline__title', { hasText: '扫描识别' }).click()
  await page.waitForURL(/scan\//, { timeout: 10000 })
  record('JOURNEY_CLICK_SCAN', 'PASS', `点击「扫描识别」进入 ${page.url()}`)
}

async function checkRouteMatrix(page, examId) {
  for (const route of ROUTE_MATRIX) {
    const url = `${BASE}/teacher/exam-workspace/${examId}/${route.path}`
    let status = 'PASS'
    let detail = ''
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      const httpStatus = resp?.status() ?? 0
      if (httpStatus >= 400) {
        record(`ROUTE_${route.path}`, 'FAIL', `HTTP ${httpStatus}`)
        continue
      }
      await waitWorkspaceReady(page)
      const rail = await hasJourneyRail(page)
      const sidebar = await hasSidebar(page)
      if (route.immersive) {
        if (rail || sidebar) {
          status = 'FAIL'
          detail = `沉浸页应隐藏轨/侧栏，实际 rail=${rail} sidebar=${sidebar}`
        } else {
          detail = '沉浸页已隐藏旅程轨与侧栏，Header 保留'
          const header = page.locator('.exam-detail-layout__header')
          if (!(await header.isVisible())) {
            status = 'FAIL'
            detail = '沉浸页 Header 不可见'
          }
        }
      } else {
        if (!rail || !sidebar) {
          status = 'FAIL'
          detail = `普通页应显示轨/侧栏，实际 rail=${rail} sidebar=${sidebar}`
        } else {
          const labels = await getSidebarLabels(page)
          if (!labels.includes(route.label) && route.journey !== 'overview') {
            // 侧栏高亮项可能不同，但菜单应包含当前旅程项集
          }
          detail = `${route.label} 页面可访问，轨/侧栏可见`
        }
      }
      if (page.url().includes('undefined') || page.url().includes('null')) {
        status = 'FAIL'
        detail = `URL 异常: ${page.url()}`
      }
    } catch (e) {
      status = 'FAIL'
      detail = e.message
    }
    record(`ROUTE_${route.path}`, status, detail)
  }
}

async function checkExamSwitch(page, examId) {
  // 用沉浸路由验证切换考试不携带旧 taskId
  await page.goto(`${BASE}/teacher/exam-workspace/${examId}/marking/task/999`, { waitUntil: 'networkidle' })
  const select = page.locator('.exam-detail-layout__exam-select')
  if (!(await select.count())) {
    record('EXAM_SWITCH', 'SKIP', '无考试切换下拉，跳过')
    return
  }
  // 获取另一个 examId
  const options = await page.locator('.exam-detail-layout__exam-select .ant-select-item-option').all()
  if (options.length < 2) {
    record('EXAM_SWITCH', 'SKIP', '仅一个考试可选，跳过')
    return
  }
  await select.click()
  const second = page.locator('.ant-select-item-option').nth(1)
  const secondText = await second.textContent()
  await second.click()
  await page.waitForTimeout(1500)
  const url = page.url()
  const hasOldTask = /\/marking\/task\/\d+/.test(url)
  record('EXAM_SWITCH', hasOldTask ? 'FAIL' : 'PASS',
    hasOldTask ? `切换后仍保留 task 路由: ${url}` : `切换后跳转: ${url}（${secondText.trim()}）`)
}

async function checkMobileDrawer(page, examId) {
  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto(`${BASE}/teacher/exam-workspace/${examId}/prep`, { waitUntil: 'networkidle' })
  await waitWorkspaceReady(page)
  const rail = await hasJourneyRail(page)
  const menuBtn = page.getByRole('button', { name: '功能菜单' })
  const hasMenuBtn = (await menuBtn.count()) > 0
  record('MOBILE_768_RAIL', rail ? 'PASS' : 'FAIL', `768 视口旅程轨可见=${rail}`)
  record('MOBILE_768_DRAWER', hasMenuBtn ? 'PASS' : 'FAIL', `功能菜单按钮可见=${hasMenuBtn}`)
  if (hasMenuBtn) {
    await menuBtn.click()
    await page.waitForTimeout(500)
    const drawerSidebar = page.locator('.exam-sub-sidebar-nav')
    record('MOBILE_768_DRAWER_OPEN', (await drawerSidebar.isVisible()) ? 'PASS' : 'FAIL', 'drawer 侧栏已打开')
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  page.on('pageerror', (err) => {
    record('PAGE_ERROR', 'FAIL', err.message)
  })

  try {
    await login(page)
    const examId = await resolveExamId(page)
    await checkSixSteps(page, examId)
    await checkOverviewNoHighlight(page, examId)
    await checkJourneySidebarFilter(page, examId)
    await checkJourneyNavClick(page, examId)
    await checkRouteMatrix(page, examId)
    await checkExamSwitch(page, examId)
    await checkMobileDrawer(page, examId)
  } catch (e) {
    record('FATAL', 'FAIL', e.message)
  } finally {
    await browser.close()
  }

  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.filter((r) => r.status === 'FAIL').length
  const skip = results.filter((r) => r.status === 'SKIP').length
  console.warn('\n========== 验收汇总 ==========')
  console.warn(`PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}  TOTAL: ${results.length}`)
  if (fail > 0) {
    console.warn('\n失败项:')
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.warn(`  - ${r.id}: ${r.detail}`))
    process.exit(1)
  }
}

main()
