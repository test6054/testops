/** 问卷身份字段类型 - SurveyIdentityFieldTypeEnum */
export enum SurveyIdentityFieldTypeCode {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  ENUM = 'ENUM',
}

export const ALL_SURVEY_IDENTITY_FIELD_TYPE_CODES: readonly SurveyIdentityFieldTypeCode[] = [
  SurveyIdentityFieldTypeCode.TEXT,
  SurveyIdentityFieldTypeCode.NUMBER,
  SurveyIdentityFieldTypeCode.DATE,
  SurveyIdentityFieldTypeCode.ENUM,
]

export const SurveyIdentityFieldTypeDescription: Record<SurveyIdentityFieldTypeCode, string> = {
  [SurveyIdentityFieldTypeCode.TEXT]: '文本',
  [SurveyIdentityFieldTypeCode.NUMBER]: '数值',
  [SurveyIdentityFieldTypeCode.DATE]: '日期',
  [SurveyIdentityFieldTypeCode.ENUM]: '枚举',
}
