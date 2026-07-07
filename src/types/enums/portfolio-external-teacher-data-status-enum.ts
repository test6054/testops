/** 外聘教师数据状态 */
export enum PortfolioExternalTeacherDataStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const ALL_PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_CODES: readonly PortfolioExternalTeacherDataStatusCode[] = [
  PortfolioExternalTeacherDataStatusCode.ACTIVE,
  PortfolioExternalTeacherDataStatusCode.INACTIVE,
]

export const PortfolioExternalTeacherDataStatusDescription: Record<PortfolioExternalTeacherDataStatusCode, string> = {
  [PortfolioExternalTeacherDataStatusCode.ACTIVE]: '有效',
  [PortfolioExternalTeacherDataStatusCode.INACTIVE]: '停用',
}
