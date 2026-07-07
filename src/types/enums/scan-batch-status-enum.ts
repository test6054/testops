/** 扫描批次状态 */
export enum ScanBatchStatusCode {
  IN_PROGRESS = 'IN_PROGRESS',
  RECEIVED = 'RECEIVED',
  BLOCKED = 'BLOCKED',
  BOUND = 'BOUND',
  COMPLETED = 'COMPLETED',
  DISCARDED = 'DISCARDED',
}

export const ALL_SCAN_BATCH_STATUS_CODES: readonly ScanBatchStatusCode[] = [
  ScanBatchStatusCode.IN_PROGRESS,
  ScanBatchStatusCode.RECEIVED,
  ScanBatchStatusCode.BLOCKED,
  ScanBatchStatusCode.BOUND,
  ScanBatchStatusCode.COMPLETED,
  ScanBatchStatusCode.DISCARDED,
]
export const ScanBatchStatusDescription: Record<ScanBatchStatusCode, string> = {
  [ScanBatchStatusCode.IN_PROGRESS]: '进行中',
  [ScanBatchStatusCode.RECEIVED]: '已接收',
  [ScanBatchStatusCode.BLOCKED]: '已阻断',
  [ScanBatchStatusCode.BOUND]: '已绑定',
  [ScanBatchStatusCode.COMPLETED]: '已完成',
  [ScanBatchStatusCode.DISCARDED]: '已废弃',
}
