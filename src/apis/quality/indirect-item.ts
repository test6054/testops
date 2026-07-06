/**
 * 间接评价题项 API - 对接 IndirectItemController
 *
 * 后端路径：/api/quality/indirect-items
 */
import type { AchievementTargetTypeCode } from './types'
import type {
  SurveyChoiceOptionRequest,
  SurveyChoiceOptionVO,
  SurveyScaleLabelRequest,
  SurveyScaleLabelVO,
} from '@/apis/public-survey'
import type { IndirectEvaluationItemTypeCode } from '@/types/enums/indirect-evaluation-item-type-enum'
import http from '@/config/axios'

const BASE = '/api/quality/indirect-items'

export interface IndirectEvaluationItemVO {
  id: string
  formId: string
  itemCode: string
  itemText: string
  targetType: AchievementTargetTypeCode
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  /** 必填；对应后端 IndirectEvaluationItemTypeEnum */
  itemType: IndirectEvaluationItemTypeCode
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
  targetType: AchievementTargetTypeCode
  targetId: string
  scaleRuleId?: string
  weight?: number
  sortOrder?: number
  /** 必填；对应后端 IndirectEvaluationItemTypeEnum */
  itemType: IndirectEvaluationItemTypeCode
  scaleMin?: number
  scaleMax?: number
  scaleLabels?: SurveyScaleLabelRequest[]
  choiceOptions?: SurveyChoiceOptionRequest[]
  required?: boolean
}

export interface IndirectEvaluationItemListByTargetRequest {
  targetType: AchievementTargetTypeCode
  targetId: string
}

export const indirectItemApi = {
  listByForm: (formId: string) =>
    http.post<IndirectEvaluationItemVO[]>(`${BASE}/list-by-form`, { id: formId }),
  listByTarget: (data: IndirectEvaluationItemListByTargetRequest) =>
    http.post<IndirectEvaluationItemVO[]>(`${BASE}/list-by-target`, data),
  detail: (id: string) => http.post<IndirectEvaluationItemVO>(`${BASE}/detail`, { id }),
  create: (data: IndirectEvaluationItemSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: IndirectEvaluationItemSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
