/** ScanEventStatus */
export enum ScanEventStatusCode {
  PENDING = 'PENDING',
  BATCHED = 'BATCHED',
  INVALID = 'INVALID',
}

export const ALL_SCAN_EVENT_STATUS_CODES: readonly ScanEventStatusCode[] = [
  ScanEventStatusCode.PENDING,
  ScanEventStatusCode.BATCHED,
  ScanEventStatusCode.INVALID,
]

export const ScanEventStatusDescription: Record<ScanEventStatusCode, string> = {
  [ScanEventStatusCode.PENDING]: '待入账',
  [ScanEventStatusCode.BATCHED]: '已入账',
  [ScanEventStatusCode.INVALID]: '无效事件',
}

