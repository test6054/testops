/** 教师发展规划类型 */
export enum PortfolioDevelopmentPlanTypeCode {
  TEACHER = 'TEACHER',
  DEPARTMENT = 'DEPARTMENT',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_TYPE_CODES: readonly PortfolioDevelopmentPlanTypeCode[] = [
  PortfolioDevelopmentPlanTypeCode.TEACHER,
  PortfolioDevelopmentPlanTypeCode.DEPARTMENT,
]

export const PortfolioDevelopmentPlanTypeDescription: Record<PortfolioDevelopmentPlanTypeCode, string> = {
  [PortfolioDevelopmentPlanTypeCode.TEACHER]: '教师年度规划',
  [PortfolioDevelopmentPlanTypeCode.DEPARTMENT]: '部门年度规划',
}
