/** 发布影响分析报告状态 - PfImpactReportStatusEnum */
export enum PfImpactReportStatusCode {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_PF_IMPACT_REPORT_STATUS_CODES: readonly PfImpactReportStatusCode[] = [
  PfImpactReportStatusCode.PENDING,
  PfImpactReportStatusCode.RUNNING,
  PfImpactReportStatusCode.COMPLETED,
  PfImpactReportStatusCode.FAILED,
]

export const PfImpactReportStatusDescription: Record<PfImpactReportStatusCode, string> = {
  [PfImpactReportStatusCode.PENDING]: '待执行',
  [PfImpactReportStatusCode.RUNNING]: '执行中',
  [PfImpactReportStatusCode.COMPLETED]: '已完成',
  [PfImpactReportStatusCode.FAILED]: '失败',
}
