/** 历史规划导入批次状态 */
export enum PortfolioDevelopmentPlanHistoryImportBatchStatusCode {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  STAGED = 'STAGED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_HISTORY_IMPORT_BATCH_STATUS_CODES: readonly PortfolioDevelopmentPlanHistoryImportBatchStatusCode[] = [
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.PENDING,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.COMPLETED,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.STAGED,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.FAILED,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode.ROLLED_BACK,
]

export const PortfolioDevelopmentPlanHistoryImportBatchStatusDescription: Record<PortfolioDevelopmentPlanHistoryImportBatchStatusCode, string> = {
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.PENDING]: '待确认',
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.COMPLETED]: '导入完成',
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.STAGED]: '已暂存',
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.FAILED]: '导入失败',
  [PortfolioDevelopmentPlanHistoryImportBatchStatusCode.ROLLED_BACK]: '已回滚',
}
