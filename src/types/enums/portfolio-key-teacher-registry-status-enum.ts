/** 骨干/带头人登记状态 */
export enum PortfolioKeyTeacherRegistryStatusCode {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export const ALL_PORTFOLIO_KEY_TEACHER_REGISTRY_STATUS_CODES: readonly PortfolioKeyTeacherRegistryStatusCode[] = [
  PortfolioKeyTeacherRegistryStatusCode.ACTIVE,
  PortfolioKeyTeacherRegistryStatusCode.REVOKED,
]

export const PortfolioKeyTeacherRegistryStatusDescription: Record<PortfolioKeyTeacherRegistryStatusCode, string> = {
  [PortfolioKeyTeacherRegistryStatusCode.ACTIVE]: '在册',
  [PortfolioKeyTeacherRegistryStatusCode.REVOKED]: '已撤销',
}
