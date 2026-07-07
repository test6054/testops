/** 档案分类适用范围 */
export enum PortfolioArchiveCategoryScopeCode {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
}

export const ALL_PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_CODES: readonly PortfolioArchiveCategoryScopeCode[] = [
  PortfolioArchiveCategoryScopeCode.SCHOOL,
  PortfolioArchiveCategoryScopeCode.DEPARTMENT,
]

export const PortfolioArchiveCategoryScopeDescription: Record<PortfolioArchiveCategoryScopeCode, string> = {
  [PortfolioArchiveCategoryScopeCode.SCHOOL]: '全校',
  [PortfolioArchiveCategoryScopeCode.DEPARTMENT]: '院系',
}
