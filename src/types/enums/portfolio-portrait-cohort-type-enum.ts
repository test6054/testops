/** 画像同群体对比类型 - PortfolioPortraitCohortTypeEnum */
export enum PortfolioPortraitCohortTypeCode {
  DEPARTMENT = 'DEPARTMENT',
  TITLE = 'TITLE',
  JOB_LEVEL = 'JOB_LEVEL',
  PROGRAM_GROUP = 'PROGRAM_GROUP',
  SCHOOL = 'SCHOOL',
}

export const ALL_PORTFOLIO_PORTRAIT_COHORT_TYPE_CODES: readonly PortfolioPortraitCohortTypeCode[] = [
  PortfolioPortraitCohortTypeCode.DEPARTMENT,
  PortfolioPortraitCohortTypeCode.TITLE,
  PortfolioPortraitCohortTypeCode.JOB_LEVEL,
  PortfolioPortraitCohortTypeCode.PROGRAM_GROUP,
  PortfolioPortraitCohortTypeCode.SCHOOL,
]

export const PortfolioPortraitCohortTypeDescription: Record<PortfolioPortraitCohortTypeCode, string> = {
  [PortfolioPortraitCohortTypeCode.DEPARTMENT]: '同院系',
  [PortfolioPortraitCohortTypeCode.TITLE]: '同职称',
  [PortfolioPortraitCohortTypeCode.JOB_LEVEL]: '同岗位等级',
  [PortfolioPortraitCohortTypeCode.PROGRAM_GROUP]: '同专业群',
  [PortfolioPortraitCohortTypeCode.SCHOOL]: '全校',
}
