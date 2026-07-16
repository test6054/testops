export enum PortfolioTitleCriteriaCheckTypeCode {
  ETHICS_CLEAR = 'ETHICS_CLEAR',
  COMMITMENT_CONFIRMED = 'COMMITMENT_CONFIRMED',
  MIN_OFFICIAL_ARCHIVE = 'MIN_OFFICIAL_ARCHIVE',
  ARCHIVE_CATEGORY_COVERAGE = 'ARCHIVE_CATEGORY_COVERAGE',
  QUALIFICATION_CERT = 'QUALIFICATION_CERT',
  SENIORITY = 'SENIORITY',
  DEGREE_REQUIREMENT = 'DEGREE_REQUIREMENT',
  PUBLICATION_COUNT = 'PUBLICATION_COUNT',
  PROJECT_COUNT = 'PROJECT_COUNT',
  HONOR_LEVEL = 'HONOR_LEVEL',
  TEACHING_HOURS = 'TEACHING_HOURS',
  TEACHING_EVALUATION = 'TEACHING_EVALUATION',
  CONTINUING_EDUCATION = 'CONTINUING_EDUCATION',
  SOCIAL_SERVICE = 'SOCIAL_SERVICE',
  OVERSEAS_EXPERIENCE = 'OVERSEAS_EXPERIENCE',
  MANUAL_CHECK = 'MANUAL_CHECK',
}

export const PortfolioTitleCriteriaCheckTypeDescription: Record<
  PortfolioTitleCriteriaCheckTypeCode,
  string
> = {
  [PortfolioTitleCriteriaCheckTypeCode.ETHICS_CLEAR]: '师德红线清除',
  [PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED]: '申报承诺',
  [PortfolioTitleCriteriaCheckTypeCode.MIN_OFFICIAL_ARCHIVE]: '最少正式档案数',
  [PortfolioTitleCriteriaCheckTypeCode.ARCHIVE_CATEGORY_COVERAGE]: '指定档案分类齐套',
  [PortfolioTitleCriteriaCheckTypeCode.QUALIFICATION_CERT]: '资格证类',
  [PortfolioTitleCriteriaCheckTypeCode.SENIORITY]: '任职年限',
  [PortfolioTitleCriteriaCheckTypeCode.DEGREE_REQUIREMENT]: '学历学位要求',
  [PortfolioTitleCriteriaCheckTypeCode.PUBLICATION_COUNT]: '论文著作数量',
  [PortfolioTitleCriteriaCheckTypeCode.PROJECT_COUNT]: '项目数量',
  [PortfolioTitleCriteriaCheckTypeCode.HONOR_LEVEL]: '获奖级别门槛',
  [PortfolioTitleCriteriaCheckTypeCode.TEACHING_HOURS]: '授课学时门槛',
  [PortfolioTitleCriteriaCheckTypeCode.TEACHING_EVALUATION]: '教学测评成绩',
  [PortfolioTitleCriteriaCheckTypeCode.CONTINUING_EDUCATION]: '继续教育完成',
  [PortfolioTitleCriteriaCheckTypeCode.SOCIAL_SERVICE]: '社会服务经历',
  [PortfolioTitleCriteriaCheckTypeCode.OVERSEAS_EXPERIENCE]: '海外经历',
  [PortfolioTitleCriteriaCheckTypeCode.MANUAL_CHECK]: '人工确认项',
}

export const ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES
  = Object.values(PortfolioTitleCriteriaCheckTypeCode)

/** 与后端 CheckTypeEnum.autoEvaluable 一致 */
export const AUTO_EVALUABLE_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES: PortfolioTitleCriteriaCheckTypeCode[] = [
  PortfolioTitleCriteriaCheckTypeCode.ETHICS_CLEAR,
  PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED,
  PortfolioTitleCriteriaCheckTypeCode.SENIORITY,
  PortfolioTitleCriteriaCheckTypeCode.DEGREE_REQUIREMENT,
  PortfolioTitleCriteriaCheckTypeCode.TEACHING_HOURS,
  PortfolioTitleCriteriaCheckTypeCode.CONTINUING_EDUCATION,
  PortfolioTitleCriteriaCheckTypeCode.OVERSEAS_EXPERIENCE,
]

export function isAutoEvaluableCheckType(checkType: PortfolioTitleCriteriaCheckTypeCode): boolean {
  return AUTO_EVALUABLE_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES.includes(checkType)
}

/** 必须声明证据档案分类的核验类型，防止任意正式档案冒充指定业务事实。 */
export const EVIDENCE_CATEGORY_REQUIRED_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES: PortfolioTitleCriteriaCheckTypeCode[] = [
  PortfolioTitleCriteriaCheckTypeCode.ARCHIVE_CATEGORY_COVERAGE,
  PortfolioTitleCriteriaCheckTypeCode.QUALIFICATION_CERT,
  PortfolioTitleCriteriaCheckTypeCode.PUBLICATION_COUNT,
  PortfolioTitleCriteriaCheckTypeCode.PROJECT_COUNT,
  PortfolioTitleCriteriaCheckTypeCode.TEACHING_EVALUATION,
  PortfolioTitleCriteriaCheckTypeCode.SOCIAL_SERVICE,
]

export function isEvidenceCategoryRequiredCheckType(checkType: PortfolioTitleCriteriaCheckTypeCode): boolean {
  return EVIDENCE_CATEGORY_REQUIRED_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES.includes(checkType)
}
