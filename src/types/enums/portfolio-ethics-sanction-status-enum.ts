/** 师德处分状态 - PortfolioEthicsSanctionStatusEnum */
export enum PortfolioEthicsSanctionStatusCode {
  IN_EFFECT = 'IN_EFFECT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  RELEASED = 'RELEASED',
}

export const ALL_PORTFOLIO_ETHICS_SANCTION_STATUS_CODES: readonly PortfolioEthicsSanctionStatusCode[] = [
  PortfolioEthicsSanctionStatusCode.IN_EFFECT,
  PortfolioEthicsSanctionStatusCode.PENDING_REVIEW,
  PortfolioEthicsSanctionStatusCode.RELEASED,
]

export const PortfolioEthicsSanctionStatusDescription: Record<PortfolioEthicsSanctionStatusCode, string> = {
  [PortfolioEthicsSanctionStatusCode.IN_EFFECT]: '处分期内',
  [PortfolioEthicsSanctionStatusCode.PENDING_REVIEW]: '期满待复核',
  [PortfolioEthicsSanctionStatusCode.RELEASED]: '已解除',
}
