/** 教师档案袋旅程步骤状态 - 与后端 PortfolioTeacherJourneyStepStatusEnum 逐值对齐 */
export enum PortfolioTeacherJourneyStepStatusCode {
  AVAILABLE = 'AVAILABLE',
  ATTENTION = 'ATTENTION',
  BLOCKED = 'BLOCKED',
}

export const ALL_PORTFOLIO_TEACHER_JOURNEY_STEP_STATUS_CODES: readonly PortfolioTeacherJourneyStepStatusCode[] = [
  PortfolioTeacherJourneyStepStatusCode.AVAILABLE,
  PortfolioTeacherJourneyStepStatusCode.ATTENTION,
  PortfolioTeacherJourneyStepStatusCode.BLOCKED,
]

export const PortfolioTeacherJourneyStepStatusDescription: Record<
  PortfolioTeacherJourneyStepStatusCode,
  string
> = {
  [PortfolioTeacherJourneyStepStatusCode.AVAILABLE]: '可前往',
  [PortfolioTeacherJourneyStepStatusCode.ATTENTION]: '需关注',
  [PortfolioTeacherJourneyStepStatusCode.BLOCKED]: '已阻断',
}
