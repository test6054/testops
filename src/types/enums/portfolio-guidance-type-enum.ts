/** 指导任务类型 - PortfolioGuidanceTypeEnum */
export enum PortfolioGuidanceTypeCode {
  NATIONAL_COMPETITION = 'NATIONAL_COMPETITION',
  PROVINCIAL_COMPETITION = 'PROVINCIAL_COMPETITION',
  SCHOOL_COMPETITION = 'SCHOOL_COMPETITION',
  INNOVATION = 'INNOVATION',
  GRADUATION_DESIGN = 'GRADUATION_DESIGN',
  SOCIAL_PRACTICE = 'SOCIAL_PRACTICE',
}

export const ALL_PORTFOLIO_GUIDANCE_TYPE_CODES: readonly PortfolioGuidanceTypeCode[] = [
  PortfolioGuidanceTypeCode.NATIONAL_COMPETITION,
  PortfolioGuidanceTypeCode.PROVINCIAL_COMPETITION,
  PortfolioGuidanceTypeCode.SCHOOL_COMPETITION,
  PortfolioGuidanceTypeCode.INNOVATION,
  PortfolioGuidanceTypeCode.GRADUATION_DESIGN,
  PortfolioGuidanceTypeCode.SOCIAL_PRACTICE,
]

export const PortfolioGuidanceTypeDescription: Record<PortfolioGuidanceTypeCode, string> = {
  [PortfolioGuidanceTypeCode.NATIONAL_COMPETITION]: '国家级学生竞赛指导',
  [PortfolioGuidanceTypeCode.PROVINCIAL_COMPETITION]: '省级学生竞赛指导',
  [PortfolioGuidanceTypeCode.SCHOOL_COMPETITION]: '校级学生竞赛指导',
  [PortfolioGuidanceTypeCode.INNOVATION]: '创新创业项目指导',
  [PortfolioGuidanceTypeCode.GRADUATION_DESIGN]: '毕业设计指导',
  [PortfolioGuidanceTypeCode.SOCIAL_PRACTICE]: '社团实践或社会实践指导',
}
