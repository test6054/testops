/** 督导复查类型 - AuditSupervisionSaveRequest.supervisionType */
export enum AuditSupervisionTypeCode {
  DAILY = 'DAILY',
  SPECIAL = 'SPECIAL',
  ACCREDITATION_PRE = 'ACCREDITATION_PRE',
  ACCREDITATION_AUDIT = 'ACCREDITATION_AUDIT',
}

export const ALL_AUDIT_SUPERVISION_TYPE_CODES: readonly AuditSupervisionTypeCode[] = [
  AuditSupervisionTypeCode.DAILY,
  AuditSupervisionTypeCode.SPECIAL,
  AuditSupervisionTypeCode.ACCREDITATION_PRE,
  AuditSupervisionTypeCode.ACCREDITATION_AUDIT,
]

export const AuditSupervisionTypeDescription: Record<AuditSupervisionTypeCode, string> = {
  [AuditSupervisionTypeCode.DAILY]: '日常督导',
  [AuditSupervisionTypeCode.SPECIAL]: '专项检查',
  [AuditSupervisionTypeCode.ACCREDITATION_PRE]: '认证预审',
  [AuditSupervisionTypeCode.ACCREDITATION_AUDIT]: '认证现场检查',
}
