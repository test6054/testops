/** 评价方法 - EvaluationMethodEnum */
export enum EvaluationMethodCode {
  DIRECT_ONLY = 'DIRECT_ONLY',
  DIRECT_INDIRECT_WEIGHTED = 'DIRECT_INDIRECT_WEIGHTED',
  MANUAL_REVIEW_CONFIRMED = 'MANUAL_REVIEW_CONFIRMED',
}

export const ALL_EVALUATION_METHOD_CODES: readonly EvaluationMethodCode[] = [
  EvaluationMethodCode.DIRECT_ONLY,
  EvaluationMethodCode.DIRECT_INDIRECT_WEIGHTED,
  EvaluationMethodCode.MANUAL_REVIEW_CONFIRMED,
]

export const EvaluationMethodDescription: Record<EvaluationMethodCode, string> = {
  [EvaluationMethodCode.DIRECT_ONLY]: '仅直接评价',
  [EvaluationMethodCode.DIRECT_INDIRECT_WEIGHTED]: '直接评价与间接评价加权',
  [EvaluationMethodCode.MANUAL_REVIEW_CONFIRMED]: '人工审核确认',
}
