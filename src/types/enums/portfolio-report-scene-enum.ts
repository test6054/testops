/** 文本分析报告场景 */
export enum PortfolioReportSceneCode {
  PORTRAIT = 'PORTRAIT',
  DEVELOPMENT_PLAN = 'DEVELOPMENT_PLAN',
  EVALUATION = 'EVALUATION',
  ANNUAL_SUMMARY = 'ANNUAL_SUMMARY',
}

export const ALL_PORTFOLIO_REPORT_SCENE_CODES: readonly PortfolioReportSceneCode[] = [
  PortfolioReportSceneCode.PORTRAIT,
  PortfolioReportSceneCode.DEVELOPMENT_PLAN,
  PortfolioReportSceneCode.EVALUATION,
  PortfolioReportSceneCode.ANNUAL_SUMMARY,
]

export const PortfolioReportSceneDescription: Record<PortfolioReportSceneCode, string> = {
  [PortfolioReportSceneCode.PORTRAIT]: '教师画像分析',
  [PortfolioReportSceneCode.DEVELOPMENT_PLAN]: '年度规划分析',
  [PortfolioReportSceneCode.EVALUATION]: '多元评价分析',
  [PortfolioReportSceneCode.ANNUAL_SUMMARY]: '年度综合报告',
}
