/** ExternalSystemType */
export enum ExternalSystemTypeCode {
  SIS = 'SIS',
  LMS = 'LMS',
  GRADEBOOK = 'GRADEBOOK',
}

export const ALL_EXTERNAL_SYSTEM_TYPE_CODES: readonly ExternalSystemTypeCode[] = [
  ExternalSystemTypeCode.SIS,
  ExternalSystemTypeCode.LMS,
  ExternalSystemTypeCode.GRADEBOOK,
]

export const ExternalSystemTypeDescription: Record<ExternalSystemTypeCode, string> = {
  [ExternalSystemTypeCode.SIS]: '教务系统 (SIS)',
  [ExternalSystemTypeCode.LMS]: '学习管理系统 (LMS)',
  [ExternalSystemTypeCode.GRADEBOOK]: '成绩册',
}

