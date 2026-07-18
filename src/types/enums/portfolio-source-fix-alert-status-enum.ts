/** §8.52 源修复运维告警状态 */
export enum PortfolioSourceFixAlertStatusCode {
  NONE = 'NONE',
  OPEN = 'OPEN',
  ACKED = 'ACKED',
  CLOSED = 'CLOSED',
}

export const PORTFOLIO_SOURCE_FIX_ALERT_STATUS_LABEL: Record<
  PortfolioSourceFixAlertStatusCode,
  string
> = {
  [PortfolioSourceFixAlertStatusCode.NONE]: '无告警',
  [PortfolioSourceFixAlertStatusCode.OPEN]: '待处理',
  [PortfolioSourceFixAlertStatusCode.ACKED]: '已确认',
  [PortfolioSourceFixAlertStatusCode.CLOSED]: '已关闭',
}
