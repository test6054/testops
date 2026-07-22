/** 产教融合项目类型 - PortfolioIndustryEducationProjectTypeEnum */
export enum PortfolioIndustryEducationProjectTypeCode {
  INDUSTRY_COLLEGE = 'INDUSTRY_COLLEGE',
  ORDER_CLASS = 'ORDER_CLASS',
  MODERN_APPRENTICE = 'MODERN_APPRENTICE',
  FIELD_ENGINEER = 'FIELD_ENGINEER',
  TRAINING_BASE = 'TRAINING_BASE',
}

export const ALL_PORTFOLIO_INDUSTRY_EDUCATION_PROJECT_TYPE_CODES: readonly PortfolioIndustryEducationProjectTypeCode[] = [
  PortfolioIndustryEducationProjectTypeCode.INDUSTRY_COLLEGE,
  PortfolioIndustryEducationProjectTypeCode.ORDER_CLASS,
  PortfolioIndustryEducationProjectTypeCode.MODERN_APPRENTICE,
  PortfolioIndustryEducationProjectTypeCode.FIELD_ENGINEER,
  PortfolioIndustryEducationProjectTypeCode.TRAINING_BASE,
]

export const PortfolioIndustryEducationProjectTypeDescription: Record<
  PortfolioIndustryEducationProjectTypeCode,
  string
> = {
  [PortfolioIndustryEducationProjectTypeCode.INDUSTRY_COLLEGE]: '产业学院',
  [PortfolioIndustryEducationProjectTypeCode.ORDER_CLASS]: '订单班',
  [PortfolioIndustryEducationProjectTypeCode.MODERN_APPRENTICE]: '现代学徒制',
  [PortfolioIndustryEducationProjectTypeCode.FIELD_ENGINEER]: '现场工程师培养',
  [PortfolioIndustryEducationProjectTypeCode.TRAINING_BASE]: '实训基地',
}
