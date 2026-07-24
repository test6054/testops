/** 教学档案袋工作壳编码 - PortfolioWorkShellEnum */
export enum PortfolioWorkShellCode {
  TEACHER = 'TEACHER',
  DEPARTMENT_REVIEW = 'DEPARTMENT_REVIEW',
  SCHOOL_GOVERNANCE = 'SCHOOL_GOVERNANCE',
  CONFIGURATION = 'CONFIGURATION',
  EXTERNAL_EXPERT = 'EXTERNAL_EXPERT',
}

export const ALL_PORTFOLIO_WORK_SHELL_CODES: readonly PortfolioWorkShellCode[] = [
  PortfolioWorkShellCode.TEACHER,
  PortfolioWorkShellCode.DEPARTMENT_REVIEW,
  PortfolioWorkShellCode.SCHOOL_GOVERNANCE,
  PortfolioWorkShellCode.CONFIGURATION,
  PortfolioWorkShellCode.EXTERNAL_EXPERT,
]

export const PortfolioWorkShellDescription: Record<PortfolioWorkShellCode, string> = {
  [PortfolioWorkShellCode.TEACHER]: '教师办理',
  [PortfolioWorkShellCode.DEPARTMENT_REVIEW]: '院系审核',
  [PortfolioWorkShellCode.SCHOOL_GOVERNANCE]: '学校治理',
  [PortfolioWorkShellCode.CONFIGURATION]: '租户配置',
  [PortfolioWorkShellCode.EXTERNAL_EXPERT]: '外部专家评审',
}
