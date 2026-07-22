/** 双师认定等级 - 与后端 PortfolioDualTeacherCertLevelEnum 一致 */
export enum PortfolioDualTeacherCertLevelCode {
  SENIOR = 'SENIOR',
  MIDDLE = 'MIDDLE',
  SCHOOL = 'SCHOOL',
}

export const PORTFOLIO_DUAL_TEACHER_CERT_LEVEL_LABEL: Record<
  PortfolioDualTeacherCertLevelCode,
  string
> = {
  [PortfolioDualTeacherCertLevelCode.SENIOR]: '高级',
  [PortfolioDualTeacherCertLevelCode.MIDDLE]: '中级',
  [PortfolioDualTeacherCertLevelCode.SCHOOL]: '校级',
}
