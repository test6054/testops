/** 教师推荐场景 */
export enum PortfolioTeacherRecommendSceneCode {
  EXCELLENT_TEACHER = 'EXCELLENT_TEACHER',
}

export const ALL_PORTFOLIO_TEACHER_RECOMMEND_SCENE_CODES: readonly PortfolioTeacherRecommendSceneCode[] = [
  PortfolioTeacherRecommendSceneCode.EXCELLENT_TEACHER,
]

export const PortfolioTeacherRecommendSceneDescription: Record<PortfolioTeacherRecommendSceneCode, string> = {
  [PortfolioTeacherRecommendSceneCode.EXCELLENT_TEACHER]: '优秀教师推荐',
}
