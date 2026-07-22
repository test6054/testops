/** 审核链路证据类型 - AuditEvidenceTypeEnum */
export enum AuditEvidenceTypeCode {
  COURSE_ARCHIVE = 'COURSE_ARCHIVE',
  ASSESSMENT_REPORT = 'ASSESSMENT_REPORT',
  REVIEW_RECORD = 'REVIEW_RECORD',
  SUPPORTING_FILE = 'SUPPORTING_FILE',
  OTHER = 'OTHER',
}

export const ALL_AUDIT_EVIDENCE_TYPE_CODES: readonly AuditEvidenceTypeCode[] = [
  AuditEvidenceTypeCode.COURSE_ARCHIVE,
  AuditEvidenceTypeCode.ASSESSMENT_REPORT,
  AuditEvidenceTypeCode.REVIEW_RECORD,
  AuditEvidenceTypeCode.SUPPORTING_FILE,
  AuditEvidenceTypeCode.OTHER,
]

export const AuditEvidenceTypeDescription: Record<AuditEvidenceTypeCode, string> = {
  [AuditEvidenceTypeCode.COURSE_ARCHIVE]: '课程归档',
  [AuditEvidenceTypeCode.ASSESSMENT_REPORT]: '评价报告',
  [AuditEvidenceTypeCode.REVIEW_RECORD]: '复核记录',
  [AuditEvidenceTypeCode.SUPPORTING_FILE]: '支撑材料',
  [AuditEvidenceTypeCode.OTHER]: '其他',
}
