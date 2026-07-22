/** 发展规划审核动作 - PortfolioDevelopmentPlanAuditActionEnum */
export enum PortfolioDevelopmentPlanAuditActionCode {
  APPROVE = 'APPROVE',
  RETURN = 'RETURN',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_AUDIT_ACTION_CODES: readonly PortfolioDevelopmentPlanAuditActionCode[] = [
  PortfolioDevelopmentPlanAuditActionCode.APPROVE,
  PortfolioDevelopmentPlanAuditActionCode.RETURN,
]

export const PortfolioDevelopmentPlanAuditActionDescription: Record<
  PortfolioDevelopmentPlanAuditActionCode,
  string
> = {
  [PortfolioDevelopmentPlanAuditActionCode.APPROVE]: '通过',
  [PortfolioDevelopmentPlanAuditActionCode.RETURN]: '退回',
}
