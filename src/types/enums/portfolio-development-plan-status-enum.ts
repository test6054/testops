/** 教师发展规划状态 */
export enum PortfolioDevelopmentPlanStatusCode {
  DRAFT = 'DRAFT',
  DEPARTMENT_PENDING = 'DEPARTMENT_PENDING',
  DEPARTMENT_RETURNED = 'DEPARTMENT_RETURNED',
  APPROVED = 'APPROVED',
  HISTORICAL = 'HISTORICAL',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_STATUS_CODES: readonly PortfolioDevelopmentPlanStatusCode[] = [
  PortfolioDevelopmentPlanStatusCode.DRAFT,
  PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING,
  PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED,
  PortfolioDevelopmentPlanStatusCode.APPROVED,
  PortfolioDevelopmentPlanStatusCode.HISTORICAL,
]

export const PortfolioDevelopmentPlanStatusDescription: Record<PortfolioDevelopmentPlanStatusCode, string> = {
  [PortfolioDevelopmentPlanStatusCode.DRAFT]: '草稿',
  [PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING]: '待部门审核',
  [PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED]: '部门退回',
  [PortfolioDevelopmentPlanStatusCode.APPROVED]: '审核通过',
  [PortfolioDevelopmentPlanStatusCode.HISTORICAL]: '历史只读',
}
