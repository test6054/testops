/** 审计结果 - PortfolioAuditOutcomeEnum */
export enum PortfolioAuditOutcomeCode {
  SUCCESS = 'SUCCESS',
  DENIED = 'DENIED',
  FAILED = 'FAILED',
}

export const PortfolioAuditOutcomeDescription: Record<PortfolioAuditOutcomeCode, string> = {
  [PortfolioAuditOutcomeCode.SUCCESS]: '成功',
  [PortfolioAuditOutcomeCode.DENIED]: '拒绝',
  [PortfolioAuditOutcomeCode.FAILED]: '失败',
}

export const ALL_PORTFOLIO_AUDIT_OUTCOME_CODES = Object.values(PortfolioAuditOutcomeCode) as PortfolioAuditOutcomeCode[]
