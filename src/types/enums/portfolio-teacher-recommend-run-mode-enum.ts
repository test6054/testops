/** 教师推荐运行模式 */
export enum PortfolioTeacherRecommendRunModeCode {
  RULE = 'RULE',
  AI = 'AI',
}

export const ALL_PORTFOLIO_TEACHER_RECOMMEND_RUN_MODE_CODES: readonly PortfolioTeacherRecommendRunModeCode[] = [
  PortfolioTeacherRecommendRunModeCode.RULE,
  PortfolioTeacherRecommendRunModeCode.AI,
]

export const PortfolioTeacherRecommendRunModeDescription: Record<PortfolioTeacherRecommendRunModeCode, string> = {
  [PortfolioTeacherRecommendRunModeCode.RULE]: '规则引擎',
  [PortfolioTeacherRecommendRunModeCode.AI]: 'AI 解释增强',
}
