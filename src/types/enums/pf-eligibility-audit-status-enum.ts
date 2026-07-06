/** 准入规则审核状态 */
export enum PfEligibilityAuditStatusCode {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export const ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES: readonly PfEligibilityAuditStatusCode[] = [
  PfEligibilityAuditStatusCode.APPROVED,
  PfEligibilityAuditStatusCode.PENDING,
  PfEligibilityAuditStatusCode.REJECTED,
]

export const PfEligibilityAuditStatusDescription: Record<PfEligibilityAuditStatusCode, string> = {
  [PfEligibilityAuditStatusCode.APPROVED]: '审核通过',
  [PfEligibilityAuditStatusCode.PENDING]: '待审',
  [PfEligibilityAuditStatusCode.REJECTED]: '驳回',
}
