/** 历史规划同步组织范围 */
export enum PortfolioPlanningSyncOrgScopeCode {
  SCHOOL = 'SCHOOL',
  ORG_UNIT = 'ORG_UNIT',
}

export const ALL_PORTFOLIO_PLANNING_SYNC_ORG_SCOPE_CODES: readonly PortfolioPlanningSyncOrgScopeCode[]
  = [PortfolioPlanningSyncOrgScopeCode.SCHOOL, PortfolioPlanningSyncOrgScopeCode.ORG_UNIT]

export const PortfolioPlanningSyncOrgScopeDescription: Record<
  PortfolioPlanningSyncOrgScopeCode,
  string
> = {
  [PortfolioPlanningSyncOrgScopeCode.SCHOOL]: '学校',
  [PortfolioPlanningSyncOrgScopeCode.ORG_UNIT]: '指定组织',
}
