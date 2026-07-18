/** §8.52 源修复重算事件状态 */
export enum PortfolioSourceFixEventStatusCode {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export const PORTFOLIO_SOURCE_FIX_EVENT_STATUS_LABEL: Record<
  PortfolioSourceFixEventStatusCode,
  string
> = {
  [PortfolioSourceFixEventStatusCode.PENDING]: '待分析',
  [PortfolioSourceFixEventStatusCode.RUNNING]: '重算中',
  [PortfolioSourceFixEventStatusCode.SUCCESS]: '全部成功',
  [PortfolioSourceFixEventStatusCode.PARTIAL]: '部分成功',
  [PortfolioSourceFixEventStatusCode.FAILED]: '失败',
}
