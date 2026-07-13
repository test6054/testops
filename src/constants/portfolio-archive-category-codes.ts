/** 课程档案五框架分类编码，与后端 PortfolioArchiveConstants 逐值一致 */
export const PORTFOLIO_COURSE_FRAMEWORK_CATEGORY_CODES = [
  'COURSE_FRAME_BASIC',
  'COURSE_FRAME_DESIGN',
  'COURSE_FRAME_IMPLEMENTATION',
  'COURSE_FRAME_EFFECT',
  'COURSE_FRAME_REFLECTION',
] as const

const COURSE_FRAMEWORK_CODE_SET = new Set<string>(PORTFOLIO_COURSE_FRAMEWORK_CATEGORY_CODES)

export function isPortfolioCourseFrameworkCategoryCode(categoryCode: string | undefined): boolean {
  return categoryCode != null && COURSE_FRAMEWORK_CODE_SET.has(categoryCode)
}
