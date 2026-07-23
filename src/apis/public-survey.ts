import type { IndirectEvaluationFormStatusCode } from '@/types/enums/indirect-evaluation-form-status-enum'
import type {
  IndirectEvaluationItemTypeCode,
} from '@/types/enums/indirect-evaluation-item-type-enum'
import type { SurveyIdentityFieldTypeCode } from '@/types/enums/survey-identity-field-type-enum'
/**
 * 公开问卷填写 API（无需认证）。
 *
 * 后端路径：/api/public/survey/:token
 */
import http from '@/config/axios'
import {
  formatPublicSurveyItemType,
  IndirectEvaluationItemTypeDescription,
} from '@/types/enums/indirect-evaluation-item-type-enum'

export { formatPublicSurveyItemType, IndirectEvaluationItemTypeDescription }

export interface PublicSurveyVO {
  formName: string
  description?: string
  welcomeMessage?: string
  status: IndirectEvaluationFormStatusCode
  startTime?: string
  endTime?: string
  allowAnonymous?: boolean
  identityFields: SurveyIdentityFieldVO[]
  items: PublicSurveyItemVO[]
}

export interface SurveyIdentityFieldVO {
  fieldKey: string
  fieldLabel: string
  fieldType: SurveyIdentityFieldTypeCode
  required: boolean
}

export interface SurveyIdentityFieldRequest {
  fieldKey: string
  fieldLabel: string
  fieldType: SurveyIdentityFieldTypeCode
  required?: boolean
}

export interface SurveyScaleLabelVO {
  scaleValue: number
  label: string
}

export interface SurveyScaleLabelRequest {
  scaleValue: number
  label: string
}

export interface SurveyChoiceOptionVO {
  optionValue: string
  optionLabel: string
}

export interface SurveyChoiceOptionRequest {
  optionValue: string
  optionLabel: string
}

export interface SurveyRespondentIdentityItemVO {
  fieldKey: string
  fieldLabel: string
  fieldValue: string
}

export interface SurveyRespondentIdentityItemRequest {
  fieldKey: string
  fieldValue: string
}

export interface SurveyRespondentIdentityRequest {
  fields: SurveyRespondentIdentityItemRequest[]
}

export interface PublicSurveyItemVO {
  itemToken: string
  itemCode: string
  itemText: string
  itemType: IndirectEvaluationItemTypeCode
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelVO[]
  choiceOptions?: SurveyChoiceOptionVO[]
  required: boolean
  sortOrder?: number
}

export interface PublicSurveySubmitRequest {
  respondentIdentity?: SurveyRespondentIdentityRequest
  answers: PublicSurveyAnswerSubmitRequest[]
}

export interface PublicSurveyAnswerSubmitRequest {
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
