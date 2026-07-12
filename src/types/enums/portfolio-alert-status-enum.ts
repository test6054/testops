/** 预警处置状态 - PortfolioAlertStatusEnum */
export enum PortfolioAlertStatusCode {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export const ALL_PORTFOLIO_ALERT_STATUS_CODES: readonly PortfolioAlertStatusCode[] = [
  PortfolioAlertStatusCode.OPEN,
  PortfolioAlertStatusCode.ACKNOWLEDGED,
  PortfolioAlertStatusCode.RESOLVED,
]

export const PortfolioAlertStatusDescription: Record<PortfolioAlertStatusCode, string> = {
  [PortfolioAlertStatusCode.OPEN]: '待处理',
  [PortfolioAlertStatusCode.ACKNOWLEDGED]: '已知晓',
  [PortfolioAlertStatusCode.RESOLVED]: '已关闭',
}
