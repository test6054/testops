import { chromium } from 'playwright'

const BASE = 'http://localhost:5273'
const EXAM_ID = '207'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名').fill('teacher')
  await page.getByPlaceholder('请输入密码').fill('Pwd@123456')
  await page.getByRole('button', { name: '立即登录' }).click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 })

  await page.goto(`${BASE}/teacher/exam-workspace/${EXAM_ID}/marking/review-batch`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const errorPanel = await page.evaluate(() => {
    const q = (sel) => document.querySelectorAll(sel).length
    const textHits = Array.from(document.querySelectorAll('*')).filter((el) => {
      const t = (el.textContent || '').trim()
      return t === '上报问题' || t === '数据加载失败'
    }).length
    return {
      uiErrorRetry: q('.ui-error-retry'),
      journeyError: q('.exam-detail-layout__journey-error'),
      retryReportTextNodes: textHits,
    }
  })

  console.log(JSON.stringify({ url: page.url(), errorPanel, pass: errorPanel.uiErrorRetry === 0 && errorPanel.journeyError === 0 && errorPanel.retryReportTextNodes === 0 }, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
