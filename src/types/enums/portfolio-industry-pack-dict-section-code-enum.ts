/** 行业包字典分区编码 - PortfolioIndustryPackDictSectionCodeEnum（仅三区，与权重维类型独立） */
export enum PortfolioIndustryPackDictSectionCode {
  ENTERPRISE_PRACTICE = 'enterprisePractice',
  QUALIFICATION = 'qualification',
  INDUSTRY_PROJECT = 'industryProject',
}

export const ALL_PORTFOLIO_INDUSTRY_PACK_DICT_SECTION_CODES: readonly PortfolioIndustryPackDictSectionCode[] = [
  PortfolioIndustryPackDictSectionCode.ENTERPRISE_PRACTICE,
  PortfolioIndustryPackDictSectionCode.QUALIFICATION,
  PortfolioIndustryPackDictSectionCode.INDUSTRY_PROJECT,
]

export const PortfolioIndustryPackDictSectionCodeDescription: Record<
  PortfolioIndustryPackDictSectionCode,
  string
> = {
  [PortfolioIndustryPackDictSectionCode.ENTERPRISE_PRACTICE]: '企业实践',
  [PortfolioIndustryPackDictSectionCode.QUALIFICATION]: '职业资格',
  [PortfolioIndustryPackDictSectionCode.INDUSTRY_PROJECT]: '行业项目',
}
