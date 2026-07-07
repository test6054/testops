/** 骨干/带头人登记类型 */
export enum PortfolioKeyTeacherRegistryTypeCode {
  PROGRAM_LEADER = 'PROGRAM_LEADER',
  KEY_TEACHER = 'KEY_TEACHER',
}

export const ALL_PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_CODES: readonly PortfolioKeyTeacherRegistryTypeCode[] = [
  PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER,
  PortfolioKeyTeacherRegistryTypeCode.KEY_TEACHER,
]

export const PortfolioKeyTeacherRegistryTypeDescription: Record<PortfolioKeyTeacherRegistryTypeCode, string> = {
  [PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER]: '专业带头人',
  [PortfolioKeyTeacherRegistryTypeCode.KEY_TEACHER]: '骨干教师',
}
