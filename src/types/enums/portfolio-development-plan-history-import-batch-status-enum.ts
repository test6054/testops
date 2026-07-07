/** 历史规划导入批次状态 */
export enum PortfolioDevelopmentPlanHistoryImportBatchStatusCode {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_HISTORY_IMPORT_BATCH_STATUS_CODES: readonly PortfolioDevelopmentPlanHistoryImportBatchStatusCode[] = [
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.PENDING,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.COMPLETED,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.FAILED,
]

export const PortfolioDevelopmentPlanHistoryImportBatchStatusDescription: Record<PortfolioDevelopmentPlanHistoryImportBatchStatusCode, string> = {
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.PENDING]: '待确认',
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.COMPLETED]: '导入完成',
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.FAILED]: '导入失败',
}
