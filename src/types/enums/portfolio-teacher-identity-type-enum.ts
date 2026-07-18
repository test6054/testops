/** 教师身份类型 - PortfolioTeacherIdentityTypeEnum */
export enum PortfolioTeacherIdentityTypeCode {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  DOUBLE_DUTY = 'DOUBLE_DUTY',
  INDUSTRY_MENTOR = 'INDUSTRY_MENTOR',
  INDUSTRY_PROFESSOR = 'INDUSTRY_PROFESSOR',
  ENTERPRISE_PART_TIME = 'ENTERPRISE_PART_TIME',
  SKILL_MASTER = 'SKILL_MASTER',
  CRAFTSMAN = 'CRAFTSMAN',
  OTHER_EXTERNAL = 'OTHER_EXTERNAL',
}

export const ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES: readonly PortfolioTeacherIdentityTypeCode[] = [
  PortfolioTeacherIdentityTypeCode.FULL_TIME,
  PortfolioTeacherIdentityTypeCode.PART_TIME,
  PortfolioTeacherIdentityTypeCode.DOUBLE_DUTY,
  PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR,
  PortfolioTeacherIdentityTypeCode.INDUSTRY_PROFESSOR,
  PortfolioTeacherIdentityTypeCode.ENTERPRISE_PART_TIME,
  PortfolioTeacherIdentityTypeCode.SKILL_MASTER,
  PortfolioTeacherIdentityTypeCode.CRAFTSMAN,
  PortfolioTeacherIdentityTypeCode.OTHER_EXTERNAL,
]

export const PortfolioTeacherIdentityTypeDescription: Record<PortfolioTeacherIdentityTypeCode, string> = {
  [PortfolioTeacherIdentityTypeCode.FULL_TIME]: '专任教师',
  [PortfolioTeacherIdentityTypeCode.PART_TIME]: '兼职教师',
  [PortfolioTeacherIdentityTypeCode.DOUBLE_DUTY]: '双肩挑教师',
  [PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR]: '产业导师',
  [PortfolioTeacherIdentityTypeCode.INDUSTRY_PROFESSOR]: '产业教授',
  [PortfolioTeacherIdentityTypeCode.ENTERPRISE_PART_TIME]: '企业兼职教师',
  [PortfolioTeacherIdentityTypeCode.SKILL_MASTER]: '技能大师',
  [PortfolioTeacherIdentityTypeCode.CRAFTSMAN]: '大国工匠',
  [PortfolioTeacherIdentityTypeCode.OTHER_EXTERNAL]: '其他外部身份',
}
