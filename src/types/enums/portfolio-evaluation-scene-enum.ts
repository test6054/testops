/** 多元评价任务业务场景（§8.48 多周期隔离）。 */
export enum PortfolioEvaluationSceneCode {
  GENERAL = 'GENERAL',
  ANNUAL_REVIEW = 'ANNUAL_REVIEW',
  ACADEMIC_YEAR = 'ACADEMIC_YEAR',
  APPOINTMENT = 'APPOINTMENT',
  TITLE_REVIEW = 'TITLE_REVIEW',
  DOUBLE_HIGH_CYCLE = 'DOUBLE_HIGH_CYCLE',
}

export const ALL_PORTFOLIO_EVALUATION_SCENE_CODES: readonly PortfolioEvaluationSceneCode[] = [
  PortfolioEvaluationSceneCode.GENERAL,
  PortfolioEvaluationSceneCode.ANNUAL_REVIEW,
  PortfolioEvaluationSceneCode.ACADEMIC_YEAR,
  PortfolioEvaluationSceneCode.APPOINTMENT,
  PortfolioEvaluationSceneCode.TITLE_REVIEW,
  PortfolioEvaluationSceneCode.DOUBLE_HIGH_CYCLE,
]

export const PortfolioEvaluationSceneDescription: Record<PortfolioEvaluationSceneCode, string> = {
  [PortfolioEvaluationSceneCode.GENERAL]: '通用评价',
  [PortfolioEvaluationSceneCode.ANNUAL_REVIEW]: '年度考核',
  [PortfolioEvaluationSceneCode.ACADEMIC_YEAR]: '学年统计',
  [PortfolioEvaluationSceneCode.APPOINTMENT]: '聘期考核',
  [PortfolioEvaluationSceneCode.TITLE_REVIEW]: '职称评审周期',
  [PortfolioEvaluationSceneCode.DOUBLE_HIGH_CYCLE]: '双高建设周期',
}
