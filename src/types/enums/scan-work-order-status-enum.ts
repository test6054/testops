/** ScanWorkOrderStatus */
export enum ScanWorkOrderStatusCode {
  IN_PROGRESS = 'IN_PROGRESS',
  COMMITTING = 'COMMITTING',
  FAILED = 'FAILED',
  COMMITTED = 'COMMITTED',
  DISCARDED = 'DISCARDED',
}

export const ALL_SCAN_WORK_ORDER_STATUS_CODES: readonly ScanWorkOrderStatusCode[] = [
  ScanWorkOrderStatusCode.IN_PROGRESS,
  ScanWorkOrderStatusCode.COMMITTING,
  ScanWorkOrderStatusCode.FAILED,
  ScanWorkOrderStatusCode.COMMITTED,
  ScanWorkOrderStatusCode.DISCARDED,
]

export const ScanWorkOrderStatusDescription: Record<ScanWorkOrderStatusCode, string> = {
  [ScanWorkOrderStatusCode.IN_PROGRESS]: '进行中',
  [ScanWorkOrderStatusCode.COMMITTING]: '提交中',
  [ScanWorkOrderStatusCode.FAILED]: '失败',
  [ScanWorkOrderStatusCode.COMMITTED]: '已提交',
  [ScanWorkOrderStatusCode.DISCARDED]: '已废弃',
}

