/**
 * Rubric 评分明细 API。
 * 后端对象：RubricItemController /api/quality/rubric-items。
 */
import http from '@/config/axios'

const RUBRIC = '/api/quality/rubric-items'

export interface RubricItemVO {
  id: string
  assessmentItemId: string
  courseGoalId: string
  courseGoalCode: string
  courseGoalName: string
  rubricCode: string
  rubricName: string
  description?: string
  fullScore: number
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface RubricItemSaveRequest {
  id?: string
  assessmentItemId: string
  courseGoalId?: string
  rubricCode?: string
  rubricName: string
  description?: string
  fullScore: number
  sortOrder?: number
}

export const rubricItemApi = {
  listByItem: (assessmentItemId: string) =>
    http.post<RubricItemVO[]>(`${RUBRIC}/list-by-item`, { id: assessmentItemId }),
  detail: (id: string) => http.post<RubricItemVO>(`${RUBRIC}/detail`, { id }),
  create: (data: RubricItemSaveRequest) => http.post<string>(`${RUBRIC}/create`, data),
  update: (data: RubricItemSaveRequest) => http.post<void>(`${RUBRIC}/update`, data),
  delete: (id: string) => http.post<void>(`${RUBRIC}/delete`, { id }),
  /** 校验 rubric 满分加总是否等于对应考核-课程目标满分。 */
  validateFullScore: (assessmentItemId: string) =>
    http.post<void>(`${RUBRIC}/validate-full-score`, { id: assessmentItemId }),
}
