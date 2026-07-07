/** 外聘教师导入批次状态 */
export enum PortfolioExternalTeacherImportBatchStatusCode {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_EXTERNAL_TEACHER_IMPORT_BATCH_STATUS_CODES: readonly PortfolioExternalTeacherImportBatchStatusCode[] = [
  PortfolioExternalTeacherImportBatchStatusCode.PENDING,
  PortfolioExternalTeacherImportBatchStatusCode.COMPLETED,
  PortfolioExternalTeacherImportBatchStatusCode.FAILED,
]

export const PortfolioExternalTeacherImportBatchStatusDescription: Record<PortfolioExternalTeacherImportBatchStatusCode, string> = {
  [PortfolioExternalTeacherImportBatchStatusCode.PENDING]: '待确认',
  [PortfolioExternalTeacherImportBatchStatusCode.COMPLETED]: '导入完成',
  [PortfolioExternalTeacherImportBatchStatusCode.FAILED]: '导入失败',
}
