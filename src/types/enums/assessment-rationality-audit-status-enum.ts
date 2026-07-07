/** 考核评价依据合理性审核状态 - AssessmentRationalityAuditStatusEnum */
export enum AssessmentRationalityAuditStatusCode {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_ASSESSMENT_RATIONALITY_AUDIT_STATUS_CODES: readonly AssessmentRationalityAuditStatusCode[] = [
  AssessmentRationalityAuditStatusCode.PENDING,
  AssessmentRationalityAuditStatusCode.APPROVED,
  AssessmentRationalityAuditStatusCode.REJECTED,
]

export const AssessmentRationalityAuditStatusDescription: Record<AssessmentRationalityAuditStatusCode, string> = {
  [AssessmentRationalityAuditStatusCode.PENDING]: '待审核',
  [AssessmentRationalityAuditStatusCode.APPROVED]: '已通过',
  [AssessmentRationalityAuditStatusCode.REJECTED]: '已驳回',
}
