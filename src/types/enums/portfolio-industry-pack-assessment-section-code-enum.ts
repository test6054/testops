/** 行业包考核表分区编码 - PortfolioIndustryPackAssessmentSectionCodeEnum（平台五区，与权重/字典枚举独立） */
export enum PortfolioIndustryPackAssessmentSectionCode {
  PRACTICE = 'practice',
  QUALIFICATION = 'qualification',
  PROJECT = 'project',
  TEACHING = 'teaching',
  SERVICE = 'service',
}

export const ALL_PORTFOLIO_INDUSTRY_PACK_ASSESSMENT_SECTION_CODES: readonly PortfolioIndustryPackAssessmentSectionCode[] = [
  PortfolioIndustryPackAssessmentSectionCode.PRACTICE,
  PortfolioIndustryPackAssessmentSectionCode.QUALIFICATION,
  PortfolioIndustryPackAssessmentSectionCode.PROJECT,
  PortfolioIndustryPackAssessmentSectionCode.TEACHING,
  PortfolioIndustryPackAssessmentSectionCode.SERVICE,
]

export const PortfolioIndustryPackAssessmentSectionCodeDescription: Record<
  PortfolioIndustryPackAssessmentSectionCode,
  string
> = {
  [PortfolioIndustryPackAssessmentSectionCode.PRACTICE]: '企业实践',
  [PortfolioIndustryPackAssessmentSectionCode.QUALIFICATION]: '职业资格',
  [PortfolioIndustryPackAssessmentSectionCode.PROJECT]: '行业项目',
  [PortfolioIndustryPackAssessmentSectionCode.TEACHING]: '教学贡献',
  [PortfolioIndustryPackAssessmentSectionCode.SERVICE]: '社会服务',
}
