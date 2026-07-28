/** 指标适用对象正式码 - PortfolioIndicatorApplicabilityCodeEnum */
export enum PortfolioIndicatorApplicabilityCode {
  ALL_TEACHERS = 'ALL_TEACHERS',
  DUAL_TEACHER = 'DUAL_TEACHER',
  KEY_TEACHER = 'KEY_TEACHER',
  PROGRAM_LEADER = 'PROGRAM_LEADER',
  EXTERNAL_TEACHER = 'EXTERNAL_TEACHER',
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  DOUBLE_DUTY = 'DOUBLE_DUTY',
  IDEOLOGICAL_FULL_TIME = 'IDEOLOGICAL_FULL_TIME',
  COUNSELOR = 'COUNSELOR',
  INDUSTRY_MENTOR = 'INDUSTRY_MENTOR',
  INDUSTRY_PROFESSOR = 'INDUSTRY_PROFESSOR',
  ENTERPRISE_PART_TIME = 'ENTERPRISE_PART_TIME',
  SKILL_MASTER = 'SKILL_MASTER',
  CRAFTSMAN = 'CRAFTSMAN',
  OTHER_EXTERNAL = 'OTHER_EXTERNAL',
}

export const PortfolioIndicatorApplicabilityDescription: Record<
  PortfolioIndicatorApplicabilityCode,
  string
> = {
  [PortfolioIndicatorApplicabilityCode.ALL_TEACHERS]: '全体教师',
  [PortfolioIndicatorApplicabilityCode.DUAL_TEACHER]: '双师型教师',
  [PortfolioIndicatorApplicabilityCode.KEY_TEACHER]: '骨干教师',
  [PortfolioIndicatorApplicabilityCode.PROGRAM_LEADER]: '专业带头人',
  [PortfolioIndicatorApplicabilityCode.EXTERNAL_TEACHER]: '外聘教师',
  [PortfolioIndicatorApplicabilityCode.FULL_TIME]: '专任教师',
  [PortfolioIndicatorApplicabilityCode.PART_TIME]: '兼职教师',
  [PortfolioIndicatorApplicabilityCode.DOUBLE_DUTY]: '双肩挑教师',
  [PortfolioIndicatorApplicabilityCode.IDEOLOGICAL_FULL_TIME]: '思政课专职教师',
  [PortfolioIndicatorApplicabilityCode.COUNSELOR]: '辅导员',
  [PortfolioIndicatorApplicabilityCode.INDUSTRY_MENTOR]: '产业导师',
  [PortfolioIndicatorApplicabilityCode.INDUSTRY_PROFESSOR]: '产业教授',
  [PortfolioIndicatorApplicabilityCode.ENTERPRISE_PART_TIME]: '企业兼职教师',
  [PortfolioIndicatorApplicabilityCode.SKILL_MASTER]: '技能大师',
  [PortfolioIndicatorApplicabilityCode.CRAFTSMAN]: '大国工匠',
  [PortfolioIndicatorApplicabilityCode.OTHER_EXTERNAL]: '其他外部身份',
}

export const PORTFOLIO_INDICATOR_APPLICABILITY_OPTIONS = Object.entries(
  PortfolioIndicatorApplicabilityDescription,
).map(([value, label]) => ({ value: value as PortfolioIndicatorApplicabilityCode, label }))
