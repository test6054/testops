import type { AssessmentItemTypeCode } from './types'
/**
 * 考核环节 API。
 * 后端对象：AssessmentItemController /api/quality/assessment-items。
 */
import type { PageResult, QueryDto } from '@/types'
import type { DataSourceModeCode } from '@/types/enums/data-source-mode-enum'
import http from '@/config/axios'

const ITEM = '/api/quality/assessment-items'

export interface AssessmentItemVO {
  id: string
  qualityCourseId: string
  itemCode: string
  itemName: string
  itemType: AssessmentItemTypeCode
  fullScore: number
  passScore?: number
  weightInCourse?: number
  isProcessOriented?: boolean
  description?: string
  sortOrder?: number
  sourceMode?: DataSourceModeCode
  sourceExamId?: string
  createTime?: string
  updateTime?: string
}

export interface AssessmentItemQueryRequest extends QueryDto {
  qualityCourseId?: string
  keyword?: string
}

export interface AssessmentItemSaveRequest {
  id?: string
  qualityCourseId: string
  itemCode: string
  itemName: string
  itemType: AssessmentItemTypeCode
  fullScore: number
  passScore?: number
  weightInCourse?: number
  isProcessOriented?: boolean
  description?: string
  sortOrder?: number
}

export const assessmentItemApi = {
  page: (data: AssessmentItemQueryRequest) =>
    http.post<PageResult<AssessmentItemVO>>(`${ITEM}/page`, data),
  detail: (id: string) => http.post<AssessmentItemVO>(`${ITEM}/detail`, { id }),
  create: (data: AssessmentItemSaveRequest) => http.post<string>(`${ITEM}/create`, data),
  update: (data: AssessmentItemSaveRequest) => http.post<void>(`${ITEM}/update`, data),
  delete: (id: string) => http.post<void>(`${ITEM}/delete`, { id }),
}
