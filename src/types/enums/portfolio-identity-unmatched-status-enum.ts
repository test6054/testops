/** 身份待匹配状态 - 与后端 PortfolioIdentityUnmatchedStatusEnum 逐值对齐 */
export enum PortfolioIdentityUnmatchedStatusEnum {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

export const ALL_PORTFOLIO_IDENTITY_UNMATCHED_STATUS_ENUMS: readonly PortfolioIdentityUnmatchedStatusEnum[] = [
  PortfolioIdentityUnmatchedStatusEnum.PENDING,
  PortfolioIdentityUnmatchedStatusEnum.RESOLVED,
  PortfolioIdentityUnmatchedStatusEnum.IGNORED,
]

export const PortfolioIdentityUnmatchedStatusDescription: Record<
  PortfolioIdentityUnmatchedStatusEnum,
  string
> = {
  [PortfolioIdentityUnmatchedStatusEnum.PENDING]: '待匹配',
  [PortfolioIdentityUnmatchedStatusEnum.RESOLVED]: '已匹配',
  [PortfolioIdentityUnmatchedStatusEnum.IGNORED]: '已忽略',
}
