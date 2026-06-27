/**
 * 公开问卷填写 API（无需认证）。
 *
 * 后端路径：/api/public/survey/:token
 */
import http from '@/config/axios'

/** 公开 / 间接评价共用题项类型 - 与后端 SCALE / SINGLE_CHOICE / MULTI_CHOICE / OPEN_TEXT 一致 */
export type PublicSurveyItemType = 'SCALE' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_TEXT'

/** 公开问卷填写页题型展示文案 */
export const PUBLIC_SURVEY_ITEM_TYPE_LABEL: Record<PublicSurveyItemType, string> = {
  SCALE: '量表题',
  SINGLE_CHOICE: '单选题',
  MULTI_CHOICE: '多选题',
  OPEN_TEXT: '填空题',
}

export interface PublicSurveyVO {
  formName: string
  description?: string
  welcomeMessage?: string
  status: string
  startTime?: string
  endTime?: string
  allowAnonymous?: boolean
  identityFields: SurveyIdentityFieldVO[]
  items: PublicSurveyItemVO[]
}

export interface SurveyIdentityFieldVO {
  fieldKey: string
  fieldLabel: string
  fieldType: string
  required: boolean
}

export interface SurveyScaleLabelVO {
  scaleValue: number
  label: string
}

export interface SurveyChoiceOptionVO {
  optionValue: string
  optionLabel: string
}

export interface SurveyRespondentIdentityItemVO {
  fieldKey: string
  fieldValue: string
}

export interface SurveyRespondentIdentityVO {
  fields: SurveyRespondentIdentityItemVO[]
}

export interface PublicSurveyItemVO {
  itemToken: string
  itemCode: string
  itemText: string
  itemType: PublicSurveyItemType
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelVO[]
  choiceOptions?: SurveyChoiceOptionVO[]
  required: boolean
  sortOrder?: number
}

export interface PublicSurveySubmitRequest {
  respondentIdentity?: SurveyRespondentIdentityVO
  answers: PublicSurveyAnswerItem[]
}

export interface PublicSurveyAnswerItem {
  itemToken: string
  scaleValue?: number
  singleChoiceValue?: string
  multipleChoiceValues?: string[]
  openText?: string
}

export interface PublicSurveySubmitResultVO {
  submissionId: string
  thankYouMessage: string
}

const PUBLIC_SURVEY = '/api/public/survey'

export const publicSurveyApi = {
  getSurvey: (token: string) =>
    http.get<PublicSurveyVO>(`${PUBLIC_SURVEY}/${token}`),
  submit: (token: string, data: PublicSurveySubmitRequest) =>
    http.post<PublicSurveySubmitResultVO>(`${PUBLIC_SURVEY}/${token}/submit`, data),
}
