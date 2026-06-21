import type { AssessmentItemType } from './types'
/**
 * 考核环节 API。
 * 后端对象：AssessmentItemController /api/quality/assessment-items。
 */
import http from '@/config/axios'

const ITEM = '/api/quality/assessment-items'

export interface AssessmentItemVO {
  id: string
  qualityCourseId: string
  itemCode: string
  itemName: string
  itemType: AssessmentItemType
  fullScore: number
  passScore?: number
  weightInCourse?: number
  isProcessOriented?: boolean
  description?: string
  sortOrder?: number
  sourceMode?: string
  sourceExamId?: string
  createTime?: string
  updateTime?: string
}

export interface AssessmentItemSaveRequest {
  id?: string
  qualityCourseId: string
  itemCode: string
  itemName: string
  itemType: AssessmentItemType
  fullScore: number
  passScore?: number
  weightInCourse?: number
  isProcessOriented?: boolean
  description?: string
  sortOrder?: number
}

export const assessmentItemApi = {
  listByCourse: (qualityCourseId: string) =>
    http.post<AssessmentItemVO[]>(`${ITEM}/list-by-course`, { id: qualityCourseId }),
  detail: (id: string) => http.post<AssessmentItemVO>(`${ITEM}/detail`, { id }),
  create: (data: AssessmentItemSaveRequest) => http.post<string>(`${ITEM}/create`, data),
  update: (data: AssessmentItemSaveRequest) => http.post<void>(`${ITEM}/update`, data),
  delete: (id: string) => http.post<void>(`${ITEM}/delete`, { id }),
}
