/** 异常批次重处理范围 */
export enum BatchReprocessScopeCode {
  ALL = 'ALL',
  FAILED_ONLY = 'FAILED_ONLY',
}

export const ALL_BATCH_REPROCESS_SCOPE_CODES: readonly BatchReprocessScopeCode[] = [
  BatchReprocessScopeCode.ALL,
  BatchReprocessScopeCode.FAILED_ONLY,
]

export const BatchReprocessScopeDescription: Record<BatchReprocessScopeCode, string> = {
  [BatchReprocessScopeCode.ALL]: '整批次',
  [BatchReprocessScopeCode.FAILED_ONLY]: '仅失败页',
}
