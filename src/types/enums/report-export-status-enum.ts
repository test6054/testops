/** 报告三格式导出状态 - ReportExportStatusEnum */
export enum ReportExportStatusCode {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_REPORT_EXPORT_STATUS_CODES: readonly ReportExportStatusCode[] = [
  ReportExportStatusCode.IDLE,
  ReportExportStatusCode.PENDING,
  ReportExportStatusCode.PROCESSING,
  ReportExportStatusCode.COMPLETED,
  ReportExportStatusCode.FAILED,
]

export const ReportExportStatusDescription: Record<ReportExportStatusCode, string> = {
  [ReportExportStatusCode.IDLE]: '从未导出',
  [ReportExportStatusCode.PENDING]: '待导出',
  [ReportExportStatusCode.PROCESSING]: '导出中',
  [ReportExportStatusCode.COMPLETED]: '已导出',
  [ReportExportStatusCode.FAILED]: '导出失败',
}
