/** 发布影响分析四维导出维度 - PfImpactReportDimensionEnum */
export enum PfImpactReportDimensionCode {
  INDICATOR = 'INDICATOR',
  TEACHER = 'TEACHER',
  ORG = 'ORG',
  ELIGIBILITY = 'ELIGIBILITY',
}

export const PfImpactReportDimensionDescription: Record<PfImpactReportDimensionCode, string> = {
  [PfImpactReportDimensionCode.INDICATOR]: '指标',
  [PfImpactReportDimensionCode.TEACHER]: '教师',
  [PfImpactReportDimensionCode.ORG]: '组织',
  [PfImpactReportDimensionCode.ELIGIBILITY]: '资格',
}
