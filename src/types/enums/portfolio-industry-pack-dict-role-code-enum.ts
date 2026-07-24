/** PortfolioIndustryPackDictRoleCodeEnum */
export enum PortfolioIndustryPackDictRoleCode {
  CORE_MEMBER = 'CORE_MEMBER',
  LEAD = 'LEAD',
  PARTICIPANT = 'PARTICIPANT',
}

export const ALL_PortfolioIndustryPackDictRole_CODES: readonly PortfolioIndustryPackDictRoleCode[] = [
  PortfolioIndustryPackDictRoleCode.CORE_MEMBER,
  PortfolioIndustryPackDictRoleCode.LEAD,
  PortfolioIndustryPackDictRoleCode.PARTICIPANT,
]

export const PortfolioIndustryPackDictRoleCodeDescription: Record<PortfolioIndustryPackDictRoleCode, string> = {
  [PortfolioIndustryPackDictRoleCode.CORE_MEMBER]: '核心成员',
  [PortfolioIndustryPackDictRoleCode.LEAD]: '主持',
  [PortfolioIndustryPackDictRoleCode.PARTICIPANT]: '参与成员',
}
