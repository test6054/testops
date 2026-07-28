/** 批量成绩更正计划明细执行状态 */
export enum BatchCorrectionItemExecutionStatusCode {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export const ALL_BATCH_CORRECTION_ITEM_EXECUTION_STATUS_CODES: readonly BatchCorrectionItemExecutionStatusCode[] = [
  BatchCorrectionItemExecutionStatusCode.PENDING,
  BatchCorrectionItemExecutionStatusCode.SUCCEEDED,
  BatchCorrectionItemExecutionStatusCode.FAILED,
]

export const BatchCorrectionItemExecutionStatusDescription: Record<
  BatchCorrectionItemExecutionStatusCode,
  string
> = {
  [BatchCorrectionItemExecutionStatusCode.PENDING]: '待执行',
  [BatchCorrectionItemExecutionStatusCode.SUCCEEDED]: '已成功',
  [BatchCorrectionItemExecutionStatusCode.FAILED]: '执行失败',
}
