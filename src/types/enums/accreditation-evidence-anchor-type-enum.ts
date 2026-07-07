/** 认证证据锚点类型 - AccreditationEvidenceAnchorTypeEnum */
export enum AccreditationEvidenceAnchorTypeCode {
  TRAINING_PLAN = 'TRAINING_PLAN',
  QUALITY_COURSE = 'QUALITY_COURSE',
  ASSESSMENT_ITEM = 'ASSESSMENT_ITEM',
  MARK_EXAM = 'MARK_EXAM',
  MARK_SCANNED_PAGE = 'MARK_SCANNED_PAGE',
  MANUAL = 'MANUAL',
}

export const ALL_ACCREDITATION_EVIDENCE_ANCHOR_TYPE_CODES: readonly AccreditationEvidenceAnchorTypeCode[] = [
  AccreditationEvidenceAnchorTypeCode.TRAINING_PLAN,
  AccreditationEvidenceAnchorTypeCode.QUALITY_COURSE,
  AccreditationEvidenceAnchorTypeCode.ASSESSMENT_ITEM,
  AccreditationEvidenceAnchorTypeCode.MARK_EXAM,
  AccreditationEvidenceAnchorTypeCode.MARK_SCANNED_PAGE,
  AccreditationEvidenceAnchorTypeCode.MANUAL,
]

export const AccreditationEvidenceAnchorTypeDescription: Record<AccreditationEvidenceAnchorTypeCode, string> = {
  [AccreditationEvidenceAnchorTypeCode.TRAINING_PLAN]: '培养方案',
  [AccreditationEvidenceAnchorTypeCode.QUALITY_COURSE]: '质量评价课程',
  [AccreditationEvidenceAnchorTypeCode.ASSESSMENT_ITEM]: '考核环节',
  [AccreditationEvidenceAnchorTypeCode.MARK_EXAM]: 'edu-mark 考试',
  [AccreditationEvidenceAnchorTypeCode.MARK_SCANNED_PAGE]: 'edu-mark 扫描页',
  [AccreditationEvidenceAnchorTypeCode.MANUAL]: '手工上传',
}

