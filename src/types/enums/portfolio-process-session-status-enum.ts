/** 教学过程记录状态 - PortfolioProcessSessionStatusEnum */
export enum PortfolioProcessSessionStatusCode {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

export const ALL_PORTFOLIO_PROCESS_SESSION_STATUS_CODES: readonly PortfolioProcessSessionStatusCode[] = [
  PortfolioProcessSessionStatusCode.DRAFT,
  PortfolioProcessSessionStatusCode.CONFIRMED,
]

export const PortfolioProcessSessionStatusDescription: Record<PortfolioProcessSessionStatusCode, string> = {
  [PortfolioProcessSessionStatusCode.DRAFT]: '草稿',
  [PortfolioProcessSessionStatusCode.CONFIRMED]: '已确认',
}
