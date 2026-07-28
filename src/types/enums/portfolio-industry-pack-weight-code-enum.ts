/** 行业包维度权重编码 - PortfolioIndustryPackWeightCodeEnum */
export enum PortfolioIndustryPackWeightCode {
  ENTERPRISE_PRACTICE = 'enterprisePractice',
  QUALIFICATION = 'qualification',
  INDUSTRY_PROJECT = 'industryProject',
  TEACHING_CONTRIBUTION = 'teachingContribution',
  SOCIAL_SERVICE = 'socialService',
  TRAINING_DEVELOPMENT = 'trainingDevelopment',
}

export const ALL_PORTFOLIO_INDUSTRY_PACK_WEIGHT_CODES: readonly PortfolioIndustryPackWeightCode[] = [
  PortfolioIndustryPackWeightCode.ENTERPRISE_PRACTICE,
  PortfolioIndustryPackWeightCode.QUALIFICATION,
  PortfolioIndustryPackWeightCode.INDUSTRY_PROJECT,
  PortfolioIndustryPackWeightCode.TEACHING_CONTRIBUTION,
  PortfolioIndustryPackWeightCode.SOCIAL_SERVICE,
  PortfolioIndustryPackWeightCode.TRAINING_DEVELOPMENT,
]

export const PortfolioIndustryPackWeightCodeDescription: Record<PortfolioIndustryPackWeightCode, string> = {
  [PortfolioIndustryPackWeightCode.ENTERPRISE_PRACTICE]: '企业实践',
  [PortfolioIndustryPackWeightCode.QUALIFICATION]: '职业资格',
  [PortfolioIndustryPackWeightCode.INDUSTRY_PROJECT]: '行业项目',
  [PortfolioIndustryPackWeightCode.TEACHING_CONTRIBUTION]: '教学贡献',
  [PortfolioIndustryPackWeightCode.SOCIAL_SERVICE]: '社会服务',
  [PortfolioIndustryPackWeightCode.TRAINING_DEVELOPMENT]: '培训发展',
}
