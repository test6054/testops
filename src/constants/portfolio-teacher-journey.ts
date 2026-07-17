import type { RouteLocationNamedRaw } from 'vue-router'

/** 教师档案袋主链旅程键 */
export type PortfolioTeacherJourneyKey = 'overview' | 'learn' | 'collect' | 'archive' | 'review'

export interface PortfolioTeacherJourneyStepDef {
  key: PortfolioTeacherJourneyKey
  title: string
  defaultRouteName: string
}

/** 教师档案袋五步旅程（独立于考试 journey 常量） */
export const PORTFOLIO_TEACHER_JOURNEY_STEPS: readonly PortfolioTeacherJourneyStepDef[] = [
  { key: 'overview', title: '我的工作台', defaultRouteName: 'PortfolioTeacherHome' },
  { key: 'learn', title: '启用档案', defaultRouteName: 'PortfolioTeacherOnboarding' },
  { key: 'collect', title: '采集材料', defaultRouteName: 'PortfolioTeacherIntake' },
  { key: 'archive', title: '我的档案', defaultRouteName: 'PortfolioTeacherArchive' },
  { key: 'review', title: '审核进度', defaultRouteName: 'PortfolioTeacherReviewStatus' },
]

const JOURNEY_KEY_SET = new Set<string>(PORTFOLIO_TEACHER_JOURNEY_STEPS.map(step => step.key))

export function isPortfolioTeacherJourneyKey(value: unknown): value is PortfolioTeacherJourneyKey {
  return typeof value === 'string' && JOURNEY_KEY_SET.has(value)
}

export function resolvePortfolioJourneyDefaultRoute(journeyKey: PortfolioTeacherJourneyKey): RouteLocationNamedRaw {
  const step = PORTFOLIO_TEACHER_JOURNEY_STEPS.find(item => item.key === journeyKey)
  if (!step) {
    throw new Error(`未知档案袋旅程键：${journeyKey}`)
  }
  return { name: step.defaultRouteName }
}
