/**
 * 间接评价题项 API - 对接 IndirectItemController
 *
 * 后端路径：/api/quality/indirect-items
 */
import type { AchievementTargetType } from './types'
import type {
  PublicSurveyItemType,
  SurveyChoiceOptionVO,
  SurveyScaleLabelVO,
} from '@/apis/public-survey'
import http from '@/config/axios'

const BASE = '/api/quality/indirect-items'

export interface IndirectEvaluationItemVO {
  id: string
  formId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetType
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  itemType: PublicSurveyItemType
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelVO[]
  choiceOptions?: SurveyChoiceOptionVO[]
  required?: boolean
  createTime?: string
  updateTime?: string
}

export interface IndirectEvaluationItemSaveRequest {
  id?: string
  formId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetType
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  itemType: PublicSurveyItemType
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelVO[]
  choiceOptions?: SurveyChoiceOptionVO[]
  required?: boolean
}

export const indirectItemApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${BASE}/list-by-form`, { id: formId }),
  listByTarget: (targetType: AchievementTargetType, targetId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${BASE}/list-by-target`, { targetType, targetId }),
  detail: (id: string) => http.post<IndirectEvaluationItemVO>(`${BASE}/detail`, { id }),
  create: (data: IndirectEvaluationItemSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: IndirectEvaluationItemSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
