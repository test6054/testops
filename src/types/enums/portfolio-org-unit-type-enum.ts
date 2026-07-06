/** 扩展组织类型 - PortfolioOrgUnitTypeEnum */
export enum PortfolioOrgUnitTypeCode {
  MAJOR_GROUP = 'MAJOR_GROUP',
  TEACHING_RESEARCH_OFFICE = 'TEACHING_RESEARCH_OFFICE',
  CAMPUS = 'CAMPUS',
}

export const ALL_PORTFOLIO_ORG_UNIT_TYPE_CODES: readonly PortfolioOrgUnitTypeCode[] = [
  PortfolioOrgUnitTypeCode.MAJOR_GROUP,
  PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE,
  PortfolioOrgUnitTypeCode.CAMPUS,
]

export const PortfolioOrgUnitTypeDescription: Record<PortfolioOrgUnitTypeCode, string> = {
  [PortfolioOrgUnitTypeCode.MAJOR_GROUP]: '专业群',
  [PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE]: '教研室',
  [PortfolioOrgUnitTypeCode.CAMPUS]: '校区',
}
