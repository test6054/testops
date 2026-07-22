/** 源修复数据源编码 - PortfolioSourceFixDataSourceCodeEnum */
export enum PortfolioSourceFixDataSourceCode {
  ARCHIVE_REVIEW = 'ARCHIVE_REVIEW',
  MANUAL = 'MANUAL',
  HISTORY_PLAN_IMPORT = 'HISTORY_PLAN_IMPORT',
  INTEGRATION_SYNC = 'INTEGRATION_SYNC',
}

export const ALL_PORTFOLIO_SOURCE_FIX_DATA_SOURCE_CODES: readonly PortfolioSourceFixDataSourceCode[] = [
  PortfolioSourceFixDataSourceCode.ARCHIVE_REVIEW,
  PortfolioSourceFixDataSourceCode.MANUAL,
  PortfolioSourceFixDataSourceCode.HISTORY_PLAN_IMPORT,
  PortfolioSourceFixDataSourceCode.INTEGRATION_SYNC,
]

export const PortfolioSourceFixDataSourceCodeDescription: Record<PortfolioSourceFixDataSourceCode, string> = {
  [PortfolioSourceFixDataSourceCode.ARCHIVE_REVIEW]: '档案审核',
  [PortfolioSourceFixDataSourceCode.MANUAL]: '人工/管理端',
  [PortfolioSourceFixDataSourceCode.HISTORY_PLAN_IMPORT]: '历史规划导入',
  [PortfolioSourceFixDataSourceCode.INTEGRATION_SYNC]: '集成同步',
}
