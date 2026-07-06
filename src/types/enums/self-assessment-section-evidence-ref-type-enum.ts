/** 自评章节证据引用类型 */
export enum SelfAssessmentSectionEvidenceRefTypeCode {
  FIELD_PATH = 'FIELD_PATH',
  ACCREDITATION_EVIDENCE = 'ACCREDITATION_EVIDENCE',
}

export const ALL_SELF_ASSESSMENT_SECTION_EVIDENCE_REF_TYPE_CODES: readonly SelfAssessmentSectionEvidenceRefTypeCode[] = [
  SelfAssessmentSectionEvidenceRefTypeCode.FIELD_PATH,
  SelfAssessmentSectionEvidenceRefTypeCode.ACCREDITATION_EVIDENCE,
]

export const SelfAssessmentSectionEvidenceRefTypeDescription: Record<SelfAssessmentSectionEvidenceRefTypeCode, string> = {
  [SelfAssessmentSectionEvidenceRefTypeCode.FIELD_PATH]: '字段路径',
  [SelfAssessmentSectionEvidenceRefTypeCode.ACCREDITATION_EVIDENCE]: '认证证据',
}

