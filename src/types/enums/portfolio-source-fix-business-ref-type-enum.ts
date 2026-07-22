/** §8.52 源修复业务引用类型 - 与后端 PortfolioSourceFixBusinessRefTypeEnum 一致 */
export enum PortfolioSourceFixBusinessRefTypeCode {
  CORRECTION_REQUEST = 'CORRECTION_REQUEST',
  HISTORY_PLAN_IMPORT_BATCH = 'HISTORY_PLAN_IMPORT_BATCH',
  INTEGRATION_SYNC = 'INTEGRATION_SYNC',
  REVIEW_TASK = 'REVIEW_TASK',
  MANUAL_BATCH = 'MANUAL_BATCH',
}

export const PORTFOLIO_SOURCE_FIX_BUSINESS_REF_TYPE_LABEL: Record<
  PortfolioSourceFixBusinessRefTypeCode,
  string
> = {
  [PortfolioSourceFixBusinessRefTypeCode.CORRECTION_REQUEST]: '纠错工单',
  [PortfolioSourceFixBusinessRefTypeCode.HISTORY_PLAN_IMPORT_BATCH]: '历史规划导入批次',
  [PortfolioSourceFixBusinessRefTypeCode.INTEGRATION_SYNC]: '集成同步',
  [PortfolioSourceFixBusinessRefTypeCode.REVIEW_TASK]: '档案审核任务',
  [PortfolioSourceFixBusinessRefTypeCode.MANUAL_BATCH]: '管理端批量',
}
