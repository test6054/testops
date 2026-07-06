/** 督导复查范围 - AuditSupervisionScopeEnum */
export enum AuditSupervisionScopeCode {
  COURSE = 'COURSE',
  PROGRAM = 'PROGRAM',
  TRAINING_PLAN = 'TRAINING_PLAN',
  COMPREHENSIVE = 'COMPREHENSIVE',
}

export const ALL_AUDIT_SUPERVISION_SCOPE_CODES: readonly AuditSupervisionScopeCode[] = [
  AuditSupervisionScopeCode.COURSE,
  AuditSupervisionScopeCode.PROGRAM,
  AuditSupervisionScopeCode.TRAINING_PLAN,
  AuditSupervisionScopeCode.COMPREHENSIVE,
]

export const AuditSupervisionScopeDescription: Record<AuditSupervisionScopeCode, string> = {
  [AuditSupervisionScopeCode.COURSE]: '课程',
  [AuditSupervisionScopeCode.PROGRAM]: '专业',
  [AuditSupervisionScopeCode.TRAINING_PLAN]: '培养方案',
  [AuditSupervisionScopeCode.COMPREHENSIVE]: '综合',
}

