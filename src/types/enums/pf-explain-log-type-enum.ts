/** 指标解释日志类型 - PfExplainLogTypeEnum */
export enum PfExplainLogTypeCode {
  SCORE = 'SCORE',
  ELIGIBILITY = 'ELIGIBILITY',
}

export const ALL_PF_EXPLAIN_LOG_TYPE_CODES: readonly PfExplainLogTypeCode[] = [
  PfExplainLogTypeCode.SCORE,
  PfExplainLogTypeCode.ELIGIBILITY,
]

export const PfExplainLogTypeDescription: Record<PfExplainLogTypeCode, string> = {
  [PfExplainLogTypeCode.SCORE]: '计分解释',
  [PfExplainLogTypeCode.ELIGIBILITY]: '资格解释',
}
