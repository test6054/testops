/** 全国教师上报问题编码 - PortfolioNationalReportIssueCodeEnum */
export enum PortfolioNationalReportIssueCode {
  MISSING_TEACHER = 'MISSING_TEACHER',
  MISSING_TEACHER_NUMBER = 'MISSING_TEACHER_NUMBER',
  MISSING_NAME = 'MISSING_NAME',
  MISSING_TITLE = 'MISSING_TITLE',
  MISSING_DEPARTMENT = 'MISSING_DEPARTMENT',
  MISSING_BIRTH_DATE = 'MISSING_BIRTH_DATE',
  MISSING_EDUCATION = 'MISSING_EDUCATION',
  MISSING_GENDER = 'MISSING_GENDER',
  INVALID_TEACHER_NUMBER = 'INVALID_TEACHER_NUMBER',
  INVALID_BIRTH_DATE = 'INVALID_BIRTH_DATE',
  INVALID_AGE = 'INVALID_AGE',
  INCONSISTENT_JOIN_DATE = 'INCONSISTENT_JOIN_DATE',
  INCONSISTENT_DEPARTMENT = 'INCONSISTENT_DEPARTMENT',
  EMPTY_ROW = 'EMPTY_ROW',
  UNKNOWN = 'UNKNOWN',
}

export const PortfolioNationalReportIssueCodeDescription: Record<
  PortfolioNationalReportIssueCode,
  string
> = {
  [PortfolioNationalReportIssueCode.MISSING_TEACHER]: '教师名册不存在',
  [PortfolioNationalReportIssueCode.MISSING_TEACHER_NUMBER]: '工号不能为空',
  [PortfolioNationalReportIssueCode.MISSING_NAME]: '姓名不能为空',
  [PortfolioNationalReportIssueCode.MISSING_TITLE]: '职称不能为空',
  [PortfolioNationalReportIssueCode.MISSING_DEPARTMENT]: '院系不能为空',
  [PortfolioNationalReportIssueCode.MISSING_BIRTH_DATE]: '出生日期不能为空',
  [PortfolioNationalReportIssueCode.MISSING_EDUCATION]: '最高学历学位不能为空',
  [PortfolioNationalReportIssueCode.MISSING_GENDER]: '性别不能为空',
  [PortfolioNationalReportIssueCode.INVALID_TEACHER_NUMBER]: '工号格式非法',
  [PortfolioNationalReportIssueCode.INVALID_BIRTH_DATE]: '出生日期不能晚于今天',
  [PortfolioNationalReportIssueCode.INVALID_AGE]: '年龄不在 18-80 合理区间',
  [PortfolioNationalReportIssueCode.INCONSISTENT_JOIN_DATE]: '来校日期早于出生日期',
  [PortfolioNationalReportIssueCode.INCONSISTENT_DEPARTMENT]: '院系 ID 存在但名称为空',
  [PortfolioNationalReportIssueCode.EMPTY_ROW]: '教师名册行为空',
  [PortfolioNationalReportIssueCode.UNKNOWN]: '未知问题',
}
