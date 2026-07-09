/**
 * 培养目标 API。
 * 后端对象：TrainingObjectiveController /api/quality/training-objectives。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const OBJECTIVE = '/api/quality/training-objectives'

export interface TrainingObjectiveVO {
  id: string
  trainingPlanId: string
  objectiveCode: string
  objectiveName: string
  description?: string
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

export interface TrainingObjectiveQueryRequest extends QueryDto {
  trainingPlanId?: string
  keyword?: string
}

export interface TrainingObjectiveSaveRequest {
  id?: string
  trainingPlanId: string
  objectiveCode: string
  objectiveName: string
  description?: string
  sortOrder?: number
}

export const trainingObjectiveApi = {
  page: (data: TrainingObjectiveQueryRequest) =>
    http.post<PageResult<TrainingObjectiveVO>>(`${OBJECTIVE}/page`, data),
  detail: (id: string) =>
    http.post<TrainingObjectiveVO>(`${OBJECTIVE}/detail`, { id }),
  create: (data: TrainingObjectiveSaveRequest) =>
    http.post<string>(`${OBJECTIVE}/create`, data),
  update: (data: TrainingObjectiveSaveRequest) =>
    http.post<void>(`${OBJECTIVE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${OBJECTIVE}/delete`, { id }),
}
