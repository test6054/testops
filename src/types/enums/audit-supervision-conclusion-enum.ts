/** 督导复查结论 - AuditSupervisionConclusionEnum */
export enum AuditSupervisionConclusionCode {
  PASS = 'PASS',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  FAIL = 'FAIL',
}

export const ALL_AUDIT_SUPERVISION_CONCLUSION_CODES: readonly AuditSupervisionConclusionCode[] = [
  AuditSupervisionConclusionCode.PASS,
  AuditSupervisionConclusionCode.NEEDS_IMPROVEMENT,
  AuditSupervisionConclusionCode.FAIL,
]

export const AuditSupervisionConclusionDescription: Record<AuditSupervisionConclusionCode, string> = {
  [AuditSupervisionConclusionCode.PASS]: '通过',
  [AuditSupervisionConclusionCode.NEEDS_IMPROVEMENT]: '需改进',
  [AuditSupervisionConclusionCode.FAIL]: '不通过',
}

