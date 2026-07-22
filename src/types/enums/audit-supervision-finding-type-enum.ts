/** 督导复查发现类型 - AuditSupervisionFindingTypeEnum */
export enum AuditSupervisionFindingTypeCode {
  PROCESS = 'PROCESS',
  MATERIAL = 'MATERIAL',
  OUTCOME = 'OUTCOME',
  GOVERNANCE = 'GOVERNANCE',
  OTHER = 'OTHER',
}

export const ALL_AUDIT_SUPERVISION_FINDING_TYPE_CODES: readonly AuditSupervisionFindingTypeCode[] = [
  AuditSupervisionFindingTypeCode.PROCESS,
  AuditSupervisionFindingTypeCode.MATERIAL,
  AuditSupervisionFindingTypeCode.OUTCOME,
  AuditSupervisionFindingTypeCode.GOVERNANCE,
  AuditSupervisionFindingTypeCode.OTHER,
]

export const AuditSupervisionFindingTypeDescription: Record<AuditSupervisionFindingTypeCode, string> = {
  [AuditSupervisionFindingTypeCode.PROCESS]: '过程执行',
  [AuditSupervisionFindingTypeCode.MATERIAL]: '材料支撑',
  [AuditSupervisionFindingTypeCode.OUTCOME]: '结果达成',
  [AuditSupervisionFindingTypeCode.GOVERNANCE]: '治理闭环',
  [AuditSupervisionFindingTypeCode.OTHER]: '其他',
}
