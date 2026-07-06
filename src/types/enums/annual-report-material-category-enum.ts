/** 年度报备材料类别 - AnnualReportMaterialCategoryEnum */
export enum AnnualReportMaterialCategoryCode {
  CONTINUOUS_IMPROVEMENT_REPORT = 'CONTINUOUS_IMPROVEMENT_REPORT',
  MIDTERM_CONTINUOUS_IMPROVEMENT_REPORT = 'MIDTERM_CONTINUOUS_IMPROVEMENT_REPORT',
  COURSE_QUALITY_EVALUATION = 'COURSE_QUALITY_EVALUATION',
  FACULTY_AND_SUPPORT = 'FACULTY_AND_SUPPORT',
  QUALITY_ASSURANCE = 'QUALITY_ASSURANCE',
  INDUSTRY_GRADUATE_FEEDBACK = 'INDUSTRY_GRADUATE_FEEDBACK',
}

export const ALL_ANNUAL_REPORT_MATERIAL_CATEGORY_CODES: readonly AnnualReportMaterialCategoryCode[] = [
  AnnualReportMaterialCategoryCode.CONTINUOUS_IMPROVEMENT_REPORT,
  AnnualReportMaterialCategoryCode.MIDTERM_CONTINUOUS_IMPROVEMENT_REPORT,
  AnnualReportMaterialCategoryCode.COURSE_QUALITY_EVALUATION,
  AnnualReportMaterialCategoryCode.FACULTY_AND_SUPPORT,
  AnnualReportMaterialCategoryCode.QUALITY_ASSURANCE,
  AnnualReportMaterialCategoryCode.INDUSTRY_GRADUATE_FEEDBACK,
]

export const AnnualReportMaterialCategoryDescription: Record<AnnualReportMaterialCategoryCode, string> = {
  [AnnualReportMaterialCategoryCode.CONTINUOUS_IMPROVEMENT_REPORT]: '年度持续改进报告',
  [AnnualReportMaterialCategoryCode.MIDTERM_CONTINUOUS_IMPROVEMENT_REPORT]: '第三年持续改进情况报告',
  [AnnualReportMaterialCategoryCode.COURSE_QUALITY_EVALUATION]: '课程评价与达成度材料',
  [AnnualReportMaterialCategoryCode.FACULTY_AND_SUPPORT]: '师资与支持条件材料',
  [AnnualReportMaterialCategoryCode.QUALITY_ASSURANCE]: '校内质量保障材料',
  [AnnualReportMaterialCategoryCode.INDUSTRY_GRADUATE_FEEDBACK]: '行业与毕业生反馈材料',
}

