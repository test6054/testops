/** 教师身份状态 - PortfolioTeacherIdentityStatusEnum */
export enum PortfolioTeacherIdentityStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export const ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES: readonly PortfolioTeacherIdentityStatusCode[] = [
  PortfolioTeacherIdentityStatusCode.ACTIVE,
  PortfolioTeacherIdentityStatusCode.INACTIVE,
  PortfolioTeacherIdentityStatusCode.EXPIRED,
]

export const PortfolioTeacherIdentityStatusDescription: Record<PortfolioTeacherIdentityStatusCode, string> = {
  [PortfolioTeacherIdentityStatusCode.ACTIVE]: '有效',
  [PortfolioTeacherIdentityStatusCode.INACTIVE]: '停用',
  [PortfolioTeacherIdentityStatusCode.EXPIRED]: '已过期',
}
