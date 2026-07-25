/** 优秀教师推荐证据类型 - PortfolioTeacherRecommendEvidenceTypeEnum */
export enum PortfolioTeacherRecommendEvidenceTypeCode {
  HONOR_COUNT = 'HONOR_COUNT',
  DUAL_TEACHER = 'DUAL_TEACHER',
  KEY_TEACHER = 'KEY_TEACHER',
  INDICATOR_SCORE = 'INDICATOR_SCORE',
}

export const ALL_PORTFOLIO_TEACHER_RECOMMEND_EVIDENCE_TYPE_CODES: readonly PortfolioTeacherRecommendEvidenceTypeCode[] = [
  PortfolioTeacherRecommendEvidenceTypeCode.HONOR_COUNT,
  PortfolioTeacherRecommendEvidenceTypeCode.DUAL_TEACHER,
  PortfolioTeacherRecommendEvidenceTypeCode.KEY_TEACHER,
  PortfolioTeacherRecommendEvidenceTypeCode.INDICATOR_SCORE,
]

export const PortfolioTeacherRecommendEvidenceTypeDescription: Record<
  PortfolioTeacherRecommendEvidenceTypeCode,
  string
> = {
  [PortfolioTeacherRecommendEvidenceTypeCode.HONOR_COUNT]: '荣誉记录数',
  [PortfolioTeacherRecommendEvidenceTypeCode.DUAL_TEACHER]: '双师认定',
  [PortfolioTeacherRecommendEvidenceTypeCode.KEY_TEACHER]: '骨干/带头人',
  [PortfolioTeacherRecommendEvidenceTypeCode.INDICATOR_SCORE]: '指标维度得分',
}
