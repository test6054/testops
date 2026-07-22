/** 外聘教师数据状态 - PortfolioExternalTeacherDataStatusEnum */
export enum PortfolioExternalTeacherDataStatusCode {
  ACTIVE = 'ACTIVE',
  /** 导入质量 C 级暂存，未入正式台账 */
  STAGED = 'STAGED',
  INACTIVE = 'INACTIVE',
}

export const ALL_PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_CODES: readonly PortfolioExternalTeacherDataStatusCode[] = [
  PortfolioExternalTeacherDataStatusCode.ACTIVE,
  PortfolioExternalTeacherDataStatusCode.STAGED,
  PortfolioExternalTeacherDataStatusCode.INACTIVE,
]

export const PortfolioExternalTeacherDataStatusDescription: Record<
  PortfolioExternalTeacherDataStatusCode,
  string
> = {
  [PortfolioExternalTeacherDataStatusCode.ACTIVE]: '有效',
  [PortfolioExternalTeacherDataStatusCode.STAGED]: '暂存',
  [PortfolioExternalTeacherDataStatusCode.INACTIVE]: '停用',
}
