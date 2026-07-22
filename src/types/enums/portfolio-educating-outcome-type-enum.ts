/** 育人成果类型 - PortfolioEducatingOutcomeTypeEnum */
export enum PortfolioEducatingOutcomeTypeCode {
  NATIONAL_COMPETITION = 'NATIONAL_COMPETITION',
  PROVINCIAL_COMPETITION = 'PROVINCIAL_COMPETITION',
  SCHOOL_COMPETITION = 'SCHOOL_COMPETITION',
  INNOVATION = 'INNOVATION',
  GRADUATION_DESIGN = 'GRADUATION_DESIGN',
  SOCIAL_PRACTICE = 'SOCIAL_PRACTICE',
  STUDENT_DEVELOPMENT = 'STUDENT_DEVELOPMENT',
}

export const ALL_PORTFOLIO_EDUCATING_OUTCOME_TYPE_CODES: readonly PortfolioEducatingOutcomeTypeCode[] = [
  PortfolioEducatingOutcomeTypeCode.NATIONAL_COMPETITION,
  PortfolioEducatingOutcomeTypeCode.PROVINCIAL_COMPETITION,
  PortfolioEducatingOutcomeTypeCode.SCHOOL_COMPETITION,
  PortfolioEducatingOutcomeTypeCode.INNOVATION,
  PortfolioEducatingOutcomeTypeCode.GRADUATION_DESIGN,
  PortfolioEducatingOutcomeTypeCode.SOCIAL_PRACTICE,
  PortfolioEducatingOutcomeTypeCode.STUDENT_DEVELOPMENT,
]

export const PortfolioEducatingOutcomeTypeDescription: Record<PortfolioEducatingOutcomeTypeCode, string> = {
  [PortfolioEducatingOutcomeTypeCode.NATIONAL_COMPETITION]: '国家级学生竞赛育人',
  [PortfolioEducatingOutcomeTypeCode.PROVINCIAL_COMPETITION]: '省级学生竞赛育人',
  [PortfolioEducatingOutcomeTypeCode.SCHOOL_COMPETITION]: '校级学生竞赛育人',
  [PortfolioEducatingOutcomeTypeCode.INNOVATION]: '创新创业育人',
  [PortfolioEducatingOutcomeTypeCode.GRADUATION_DESIGN]: '毕业设计育人',
  [PortfolioEducatingOutcomeTypeCode.SOCIAL_PRACTICE]: '社团/社会实践育人',
  [PortfolioEducatingOutcomeTypeCode.STUDENT_DEVELOPMENT]: '学生发展支撑育人',
}
