/**
 * 指标适用对象专项令牌 - PortfolioIndicatorApplicabilityTokenEnum
 * 与教师身份类型 name 并列构成适用声明唯一真源；禁止中文/别名写入。
 */
export enum PortfolioIndicatorApplicabilityTokenCode {
  ALL_TEACHERS = 'ALL_TEACHERS',
  DUAL_TEACHER = 'DUAL_TEACHER',
  KEY_TEACHER = 'KEY_TEACHER',
  PROGRAM_LEADER = 'PROGRAM_LEADER',
  EXTERNAL_TEACHER = 'EXTERNAL_TEACHER',
}

export const ALL_PORTFOLIO_INDICATOR_APPLICABILITY_TOKEN_CODES: readonly PortfolioIndicatorApplicabilityTokenCode[] = [
  PortfolioIndicatorApplicabilityTokenCode.ALL_TEACHERS,
  PortfolioIndicatorApplicabilityTokenCode.DUAL_TEACHER,
  PortfolioIndicatorApplicabilityTokenCode.KEY_TEACHER,
  PortfolioIndicatorApplicabilityTokenCode.PROGRAM_LEADER,
  PortfolioIndicatorApplicabilityTokenCode.EXTERNAL_TEACHER,
]

export const PortfolioIndicatorApplicabilityTokenDescription: Record<
  PortfolioIndicatorApplicabilityTokenCode,
  string
> = {
  [PortfolioIndicatorApplicabilityTokenCode.ALL_TEACHERS]: '全体教师',
  [PortfolioIndicatorApplicabilityTokenCode.DUAL_TEACHER]: '双师型教师',
  [PortfolioIndicatorApplicabilityTokenCode.KEY_TEACHER]: '骨干教师',
  [PortfolioIndicatorApplicabilityTokenCode.PROGRAM_LEADER]: '专业带头人',
  [PortfolioIndicatorApplicabilityTokenCode.EXTERNAL_TEACHER]: '外聘教师',
}
