/** 档案分类状态 */
export enum PortfolioArchiveCategoryStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const ALL_PORTFOLIO_ARCHIVE_CATEGORY_STATUS_CODES: readonly PortfolioArchiveCategoryStatusCode[] = [
  PortfolioArchiveCategoryStatusCode.ACTIVE,
  PortfolioArchiveCategoryStatusCode.INACTIVE,
]

export const PortfolioArchiveCategoryStatusDescription: Record<PortfolioArchiveCategoryStatusCode, string> = {
  [PortfolioArchiveCategoryStatusCode.ACTIVE]: '启用',
  [PortfolioArchiveCategoryStatusCode.INACTIVE]: '停用',
}
