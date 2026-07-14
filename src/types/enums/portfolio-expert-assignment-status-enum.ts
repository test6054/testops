/** 外部专家授权状态 - PortfolioExpertAssignmentStatusEnum */
export enum PortfolioExpertAssignmentStatusCode {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export const ALL_PORTFOLIO_EXPERT_ASSIGNMENT_STATUS_CODES: readonly PortfolioExpertAssignmentStatusCode[] = [
  PortfolioExpertAssignmentStatusCode.ACTIVE,
  PortfolioExpertAssignmentStatusCode.REVOKED,
  PortfolioExpertAssignmentStatusCode.EXPIRED,
]

export const PortfolioExpertAssignmentStatusDescription: Record<PortfolioExpertAssignmentStatusCode, string> = {
  [PortfolioExpertAssignmentStatusCode.ACTIVE]: '有效',
  [PortfolioExpertAssignmentStatusCode.REVOKED]: '已吊销',
  [PortfolioExpertAssignmentStatusCode.EXPIRED]: '已过期',
}
