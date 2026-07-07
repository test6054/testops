/** MarkOcrHealthStatus */
export enum MarkOcrHealthStatusCode {
  UNKNOWN = 'UNKNOWN',
  HEALTHY = 'HEALTHY',
  FAILED = 'FAILED',
}

export const ALL_MARK_OCR_HEALTH_STATUS_CODES: readonly MarkOcrHealthStatusCode[] = [
  MarkOcrHealthStatusCode.UNKNOWN,
  MarkOcrHealthStatusCode.HEALTHY,
  MarkOcrHealthStatusCode.FAILED,
]

export const MarkOcrHealthStatusDescription: Record<MarkOcrHealthStatusCode, string> = {
  [MarkOcrHealthStatusCode.UNKNOWN]: '未检查',
  [MarkOcrHealthStatusCode.HEALTHY]: '健康',
  [MarkOcrHealthStatusCode.FAILED]: '异常',
}

