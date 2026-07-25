/** 教师档案袋旅程步骤键 - 与后端 PortfolioTeacherJourneyStepKeyEnum 逐值对齐 */
export enum PortfolioTeacherJourneyStepKeyCode {
  OVERVIEW = 'OVERVIEW',
  LEARN = 'LEARN',
  COLLECT = 'COLLECT',
  ARCHIVE = 'ARCHIVE',
  REVIEW = 'REVIEW',
}

export const ALL_PORTFOLIO_TEACHER_JOURNEY_STEP_KEY_CODES: readonly PortfolioTeacherJourneyStepKeyCode[] = [
  PortfolioTeacherJourneyStepKeyCode.OVERVIEW,
  PortfolioTeacherJourneyStepKeyCode.LEARN,
  PortfolioTeacherJourneyStepKeyCode.COLLECT,
  PortfolioTeacherJourneyStepKeyCode.ARCHIVE,
  PortfolioTeacherJourneyStepKeyCode.REVIEW,
]

export const PortfolioTeacherJourneyStepKeyDescription: Record<PortfolioTeacherJourneyStepKeyCode, string> = {
  [PortfolioTeacherJourneyStepKeyCode.OVERVIEW]: '我的工作台',
  [PortfolioTeacherJourneyStepKeyCode.LEARN]: '启用档案',
  [PortfolioTeacherJourneyStepKeyCode.COLLECT]: '采集材料',
  [PortfolioTeacherJourneyStepKeyCode.ARCHIVE]: '我的档案',
  [PortfolioTeacherJourneyStepKeyCode.REVIEW]: '审核进度',
}
