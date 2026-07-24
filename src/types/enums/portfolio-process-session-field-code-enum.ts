/** 过程课次模板字段编码 - PortfolioProcessSessionFieldCodeEnum */
export enum PortfolioProcessSessionFieldCode {
  SESSION_TITLE = 'sessionTitle',
  SESSION_DATE = 'sessionDate',
  COURSE_NAME = 'courseName',
  COURSE_CODE = 'courseCode',
  ACADEMIC_YEAR = 'academicYear',
  SEMESTER = 'semester',
  PREP = 'prep',
  PROCESS = 'process',
  FEEDBACK = 'feedback',
  CONTENT = 'content',
}

export const PortfolioProcessSessionFieldDescription: Record<PortfolioProcessSessionFieldCode, string> = {
  [PortfolioProcessSessionFieldCode.SESSION_TITLE]: '课次标题',
  [PortfolioProcessSessionFieldCode.SESSION_DATE]: '课次日期',
  [PortfolioProcessSessionFieldCode.COURSE_NAME]: '课程名称',
  [PortfolioProcessSessionFieldCode.COURSE_CODE]: '课程代码',
  [PortfolioProcessSessionFieldCode.ACADEMIC_YEAR]: '学年',
  [PortfolioProcessSessionFieldCode.SEMESTER]: '学期',
  [PortfolioProcessSessionFieldCode.PREP]: '课前准备',
  [PortfolioProcessSessionFieldCode.PROCESS]: '课堂过程',
  [PortfolioProcessSessionFieldCode.FEEDBACK]: '结果反馈',
  [PortfolioProcessSessionFieldCode.CONTENT]: '全过程叙述',
}
