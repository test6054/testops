/** 认证结论类型 - AccreditationConclusionTypeEnum */
export enum AccreditationConclusionTypeCode {
  FULL_6Y = 'FULL_6Y',
  CONDITIONAL_6Y = 'CONDITIONAL_6Y',
  NOT_PASS = 'NOT_PASS',
}

export const ALL_ACCREDITATION_CONCLUSION_TYPE_CODES: readonly AccreditationConclusionTypeCode[] = [
  AccreditationConclusionTypeCode.FULL_6Y,
  AccreditationConclusionTypeCode.CONDITIONAL_6Y,
  AccreditationConclusionTypeCode.NOT_PASS,
]

export const AccreditationConclusionTypeDescription: Record<AccreditationConclusionTypeCode, string> = {
  [AccreditationConclusionTypeCode.FULL_6Y]: '通过（6年）',
  [AccreditationConclusionTypeCode.CONDITIONAL_6Y]: '有条件通过',
  [AccreditationConclusionTypeCode.NOT_PASS]: '不通过',
}

