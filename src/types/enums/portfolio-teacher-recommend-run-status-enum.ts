/** 教师推荐运行状态 */
export enum PortfolioTeacherRecommendRunStatusCode {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_TEACHER_RECOMMEND_RUN_STATUS_CODES: readonly PortfolioTeacherRecommendRunStatusCode[] = [
  PortfolioTeacherRecommendRunStatusCode.RUNNING,
  PortfolioTeacherRecommendRunStatusCode.COMPLETED,
  PortfolioTeacherRecommendRunStatusCode.FAILED,
]

export const PortfolioTeacherRecommendRunStatusDescription: Record<PortfolioTeacherRecommendRunStatusCode, string> = {
  [PortfolioTeacherRecommendRunStatusCode.RUNNING]: '运行中',
  [PortfolioTeacherRecommendRunStatusCode.COMPLETED]: '已完成',
  [PortfolioTeacherRecommendRunStatusCode.FAILED]: '失败',
}
