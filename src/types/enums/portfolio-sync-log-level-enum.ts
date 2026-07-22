/** 集成同步日志级别 - PortfolioSyncLogLevelEnum */
export enum PortfolioSyncLogLevelCode {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export const ALL_PORTFOLIO_SYNC_LOG_LEVEL_CODES: readonly PortfolioSyncLogLevelCode[] = [
  PortfolioSyncLogLevelCode.INFO,
  PortfolioSyncLogLevelCode.WARN,
  PortfolioSyncLogLevelCode.ERROR,
]

export const PortfolioSyncLogLevelDescription: Record<PortfolioSyncLogLevelCode, string> = {
  [PortfolioSyncLogLevelCode.INFO]: '信息',
  [PortfolioSyncLogLevelCode.WARN]: '警告',
  [PortfolioSyncLogLevelCode.ERROR]: '错误',
}
