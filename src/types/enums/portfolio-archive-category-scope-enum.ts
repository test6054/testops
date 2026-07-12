/** 档案分类适用范围 */
export enum PortfolioArchiveCategoryScopeCode {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
  TEACHER = 'TEACHER',
}

export const ALL_PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_CODES: readonly PortfolioArchiveCategoryScopeCode[] = [
  PortfolioArchiveCategoryScopeCode.SCHOOL,
  PortfolioArchiveCategoryScopeCode.DEPARTMENT,
  PortfolioArchiveCategoryScopeCode.TEACHER,
]

export const PortfolioArchiveCategoryScopeDescription: Record<PortfolioArchiveCategoryScopeCode, string> = {
  [PortfolioArchiveCategoryScopeCode.SCHOOL]: '全校',
  [PortfolioArchiveCategoryScopeCode.DEPARTMENT]: '院系',
  [PortfolioArchiveCategoryScopeCode.TEACHER]: '教师自建',
}

/** 是否 TEACHER 范围分类 */
export function isTeacherArchiveCategoryScope(scope: PortfolioArchiveCategoryScopeCode): boolean {
  return scope === PortfolioArchiveCategoryScopeCode.TEACHER
}
