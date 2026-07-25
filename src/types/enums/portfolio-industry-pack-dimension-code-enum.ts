/**
 * 行业包维度正式编码（权重维 / 字典分区维共用合同码）。
 * 与后端 PortfolioIndustryPackDimensionCodeEnum.name() 对齐。
 */
export enum PortfolioIndustryPackDimensionCode {
  ENTERPRISE_PRACTICE = 'ENTERPRISE_PRACTICE',
  QUALIFICATION = 'QUALIFICATION',
  INDUSTRY_PROJECT = 'INDUSTRY_PROJECT',
  TEACHING_CONTRIBUTION = 'TEACHING_CONTRIBUTION',
  SOCIAL_SERVICE = 'SOCIAL_SERVICE',
  TRAINING_DEVELOPMENT = 'TRAINING_DEVELOPMENT',
}

export const PortfolioIndustryPackDimensionCodeDescription: Record<
  PortfolioIndustryPackDimensionCode,
  string
> = {
  [PortfolioIndustryPackDimensionCode.ENTERPRISE_PRACTICE]: '企业实践',
  [PortfolioIndustryPackDimensionCode.QUALIFICATION]: '职业资格',
  [PortfolioIndustryPackDimensionCode.INDUSTRY_PROJECT]: '产业项目',
  [PortfolioIndustryPackDimensionCode.TEACHING_CONTRIBUTION]: '教学贡献',
  [PortfolioIndustryPackDimensionCode.SOCIAL_SERVICE]: '社会服务',
  [PortfolioIndustryPackDimensionCode.TRAINING_DEVELOPMENT]: '培训发展',
}
