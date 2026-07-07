/** 年度报备材料状态 - AnnualReportMaterialStatusEnum */
export enum AnnualReportMaterialStatusCode {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_ANNUAL_REPORT_MATERIAL_STATUS_CODES: readonly AnnualReportMaterialStatusCode[] = [
  AnnualReportMaterialStatusCode.DRAFT,
  AnnualReportMaterialStatusCode.SUBMITTED,
  AnnualReportMaterialStatusCode.APPROVED,
  AnnualReportMaterialStatusCode.REJECTED,
]

export const AnnualReportMaterialStatusDescription: Record<AnnualReportMaterialStatusCode, string> = {
  [AnnualReportMaterialStatusCode.DRAFT]: '草稿',
  [AnnualReportMaterialStatusCode.SUBMITTED]: '已提交',
  [AnnualReportMaterialStatusCode.APPROVED]: '已通过',
  [AnnualReportMaterialStatusCode.REJECTED]: '已退回',
}

