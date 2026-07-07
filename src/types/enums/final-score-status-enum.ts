/** 最终成绩状态 */
export enum FinalScoreStatusCode {
  PENDING = 'PENDING',
  CALCULATED = 'CALCULATED',
  CONFIRMED = 'CONFIRMED',
  CORRECTED = 'CORRECTED',
  PUBLISHED = 'PUBLISHED',
  WITHDRAWN = 'WITHDRAWN',
}

export const ALL_FINAL_SCORE_STATUS_CODES: readonly FinalScoreStatusCode[] = [
  FinalScoreStatusCode.PENDING,
  FinalScoreStatusCode.CALCULATED,
  FinalScoreStatusCode.CONFIRMED,
  FinalScoreStatusCode.CORRECTED,
  FinalScoreStatusCode.PUBLISHED,
  FinalScoreStatusCode.WITHDRAWN,
]

export const FinalScoreStatusDescription: Record<FinalScoreStatusCode, string> = {
  [FinalScoreStatusCode.PENDING]: '待计算',
  [FinalScoreStatusCode.CALCULATED]: '已计算',
  [FinalScoreStatusCode.CONFIRMED]: '已确认',
  [FinalScoreStatusCode.CORRECTED]: '已更正',
  [FinalScoreStatusCode.PUBLISHED]: '已发布',
  [FinalScoreStatusCode.WITHDRAWN]: '已撤回',
}
