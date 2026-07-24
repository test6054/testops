/** 指导/育人学生成效 - PortfolioStudentOutcomeCodeEnum */
export enum PortfolioStudentOutcomeCode {
  STUDENT_DEVELOPMENT = 'STUDENT_DEVELOPMENT',
  AWARD = 'AWARD',
  PROCESS_ONLY = 'PROCESS_ONLY',
}

export const ALL_PORTFOLIO_STUDENT_OUTCOME_CODES: readonly PortfolioStudentOutcomeCode[] = [
  PortfolioStudentOutcomeCode.STUDENT_DEVELOPMENT,
  PortfolioStudentOutcomeCode.AWARD,
  PortfolioStudentOutcomeCode.PROCESS_ONLY,
]

export const PortfolioStudentOutcomeDescription: Record<PortfolioStudentOutcomeCode, string> = {
  [PortfolioStudentOutcomeCode.STUDENT_DEVELOPMENT]: '就业升学能力成长',
  [PortfolioStudentOutcomeCode.AWARD]: '获奖成效',
  [PortfolioStudentOutcomeCode.PROCESS_ONLY]: '仅过程',
}
