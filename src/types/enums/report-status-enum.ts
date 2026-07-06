/** 报告状态 - ReportStatusEnum */
export enum ReportStatusCode {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  RETURNED = 'RETURNED',
  CONFIRMED = 'CONFIRMED',
  ARCHIVED = 'ARCHIVED',
}

export const ALL_REPORT_STATUS_CODES: readonly ReportStatusCode[] = [
  ReportStatusCode.DRAFT,
  ReportStatusCode.SUBMITTED,
  ReportStatusCode.RETURNED,
  ReportStatusCode.CONFIRMED,
  ReportStatusCode.ARCHIVED,
]

export const ReportStatusDescription: Record<ReportStatusCode, string> = {
  [ReportStatusCode.DRAFT]: '起草中',
  [ReportStatusCode.SUBMITTED]: '已提交',
  [ReportStatusCode.RETURNED]: '已退回',
  [ReportStatusCode.CONFIRMED]: '已确认',
  [ReportStatusCode.ARCHIVED]: '已归档',
}
