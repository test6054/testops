/**
 * 公开问卷填写 API（无需认证）。
 *
 * 后端路径：/api/public/survey/:token
 */
import http from '@/config/axios'

export interface PublicSurveyVO {
  formName: string
  description?: string
  welcomeMessage?: string
  status: string
  startTime?: string
  endTime?: string
  allowAnonymous?: boolean
  requireIdentityFields?: string
  items: PublicSurveyItemVO[]
}

export interface PublicSurveyItemVO {
  id: string
  itemCode: string
  itemText: string
  itemType: 'SCALE' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_TEXT'
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: string
  choiceOptions?: string
  required: boolean
  sortOrder?: number
}

export interface PublicSurveySubmitPayload {
  respondentName?: string
  respondentContact?: string
  respondentIdentity?: string
  answers: PublicSurveyAnswerItem[]
}

export interface PublicSurveyAnswerItem {
  itemId: string
  rawValue?: string
  openText?: string
}

const PUBLIC_SURVEY = '/api/public/survey'

export const publicSurveyApi = {
  getSurvey: (token: string) =>
    http.get<PublicSurveyVO>(`${PUBLIC_SURVEY}/${token}`),
  submit: (token: string, data: PublicSurveySubmitPayload) =>
    http.post<string>(`${PUBLIC_SURVEY}/${token}/submit`, data),
}
