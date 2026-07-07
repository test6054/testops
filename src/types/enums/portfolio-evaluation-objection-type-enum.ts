/** 评价异议类型 - PortfolioEvaluationObjectionTypeEnum */
export enum PortfolioEvaluationObjectionTypeCode {
  RESULT_DISPUTE = 'RESULT_DISPUTE',
  SCORE_DISPUTE = 'SCORE_DISPUTE',
  MATERIAL_DISPUTE = 'MATERIAL_DISPUTE',
  OTHER = 'OTHER',
}

export const ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES: readonly PortfolioEvaluationObjectionTypeCode[] = [
  PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE,
  PortfolioEvaluationObjectionTypeCode.SCORE_DISPUTE,
  PortfolioEvaluationObjectionTypeCode.MATERIAL_DISPUTE,
  PortfolioEvaluationObjectionTypeCode.OTHER,
]

export const PortfolioEvaluationObjectionTypeDescription: Record<PortfolioEvaluationObjectionTypeCode, string> = {
  [PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE]: '结果争议',
  [PortfolioEvaluationObjectionTypeCode.SCORE_DISPUTE]: '分值争议',
  [PortfolioEvaluationObjectionTypeCode.MATERIAL_DISPUTE]: '材料依据争议',
  [PortfolioEvaluationObjectionTypeCode.OTHER]: '其他',
}
