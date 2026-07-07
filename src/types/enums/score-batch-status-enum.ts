/** 成绩批次状态 - ScoreBatchStatusEnum */
export enum ScoreBatchStatusCode {
  PENDING = 'PENDING',
  PARSING = 'PARSING',
  PREVIEW_READY = 'PREVIEW_READY',
  VALIDATED = 'VALIDATED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_SCORE_BATCH_STATUS_CODES: readonly ScoreBatchStatusCode[] = [
  ScoreBatchStatusCode.PENDING,
  ScoreBatchStatusCode.PARSING,
  ScoreBatchStatusCode.PREVIEW_READY,
  ScoreBatchStatusCode.VALIDATED,
  ScoreBatchStatusCode.CONFIRMED,
  ScoreBatchStatusCode.FAILED,
  ScoreBatchStatusCode.CANCELLED,
]

export const ScoreBatchStatusDescription: Record<ScoreBatchStatusCode, string> = {
  [ScoreBatchStatusCode.PENDING]: '待处理',
  [ScoreBatchStatusCode.PARSING]: '解析中',
  [ScoreBatchStatusCode.PREVIEW_READY]: '预览就绪',
  [ScoreBatchStatusCode.VALIDATED]: '已校验',
  [ScoreBatchStatusCode.CONFIRMED]: '已确认',
  [ScoreBatchStatusCode.FAILED]: '失败',
  [ScoreBatchStatusCode.CANCELLED]: '已取消',
}
