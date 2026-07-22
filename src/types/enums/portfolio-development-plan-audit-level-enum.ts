/** 发展规划审核层级 - PortfolioDevelopmentPlanAuditLevelEnum */
export enum PortfolioDevelopmentPlanAuditLevelCode {
  DEPARTMENT = 'DEPARTMENT',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_AUDIT_LEVEL_CODES: readonly PortfolioDevelopmentPlanAuditLevelCode[] = [
  PortfolioDevelopmentPlanAuditLevelCode.DEPARTMENT,
]

export const PortfolioDevelopmentPlanAuditLevelDescription: Record<
  PortfolioDevelopmentPlanAuditLevelCode,
  string
> = {
  [PortfolioDevelopmentPlanAuditLevelCode.DEPARTMENT]: '院系审核',
}
