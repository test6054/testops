/** 自评章节内容状态 */
export enum SelfAssessmentSectionContentStatusCode {
  DRAFT = 'DRAFT',
  READY = 'READY',
}

export const ALL_SELF_ASSESSMENT_SECTION_CONTENT_STATUS_CODES: readonly SelfAssessmentSectionContentStatusCode[] = [
  SelfAssessmentSectionContentStatusCode.DRAFT,
  SelfAssessmentSectionContentStatusCode.READY,
]

export const SelfAssessmentSectionContentStatusDescription: Record<SelfAssessmentSectionContentStatusCode, string> = {
  [SelfAssessmentSectionContentStatusCode.DRAFT]: '草稿',
  [SelfAssessmentSectionContentStatusCode.READY]: '就绪',
}

