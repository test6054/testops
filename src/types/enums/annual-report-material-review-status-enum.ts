/** 年度报备材料审核状态 - AnnualReportMaterialReviewStatusEnum */
export enum AnnualReportMaterialReviewStatusCode {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_ANNUAL_REPORT_MATERIAL_REVIEW_STATUS_CODES: readonly AnnualReportMaterialReviewStatusCode[] = [
  AnnualReportMaterialReviewStatusCode.APPROVED,
  AnnualReportMaterialReviewStatusCode.REJECTED,
]

export const AnnualReportMaterialReviewStatusDescription: Record<AnnualReportMaterialReviewStatusCode, string> = {
  [AnnualReportMaterialReviewStatusCode.APPROVED]: '已通过',
  [AnnualReportMaterialReviewStatusCode.REJECTED]: '已退回',
}
