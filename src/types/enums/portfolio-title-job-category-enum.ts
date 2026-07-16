export enum PortfolioTitleJobCategoryCode {
  TEACHING_RESEARCH = 'TEACHING_RESEARCH',
  TEACHING_PRIMARY = 'TEACHING_PRIMARY',
  RESEARCH_PRIMARY = 'RESEARCH_PRIMARY',
  SOCIAL_SERVICE = 'SOCIAL_SERVICE',
  CLINICAL_PRIMARY = 'CLINICAL_PRIMARY',
}

export const PortfolioTitleJobCategoryDescription: Record<
  PortfolioTitleJobCategoryCode,
  string
> = {
  [PortfolioTitleJobCategoryCode.TEACHING_RESEARCH]: '教学科研型',
  [PortfolioTitleJobCategoryCode.TEACHING_PRIMARY]: '教学为主型',
  [PortfolioTitleJobCategoryCode.RESEARCH_PRIMARY]: '科研为主型',
  [PortfolioTitleJobCategoryCode.SOCIAL_SERVICE]: '社会服务型',
  [PortfolioTitleJobCategoryCode.CLINICAL_PRIMARY]: '临床为主型',
}

export const ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES = Object.values(PortfolioTitleJobCategoryCode)
