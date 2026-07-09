/**
 * 培养目标-毕业要求权重映射 API。
 * 后端对象：TrainingObjectiveRequirementController /api/quality/training-objective-requirements。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const MAPPING = '/api/quality/training-objective-requirements'

export interface TrainingObjectiveRequirementVO {
  id: string
  trainingPlanId: string
  trainingObjectiveId: string
  graduationRequirementId: string
  weight: number
  sortOrder?: number
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface TrainingObjectiveRequirementQueryRequest extends QueryDto {
  trainingPlanId?: string
  trainingObjectiveId?: string
  graduationRequirementId?: string
}

export interface TrainingObjectiveRequirementSaveRequest {
  id?: string
  trainingObjectiveId: string
  graduationRequirementId: string
  weight: number
  sortOrder?: number
  notes?: string
}

export const trainingObjectiveRequirementApi = {
  page: (data: TrainingObjectiveRequirementQueryRequest) =>
    http.post<PageResult<TrainingObjectiveRequirementVO>>(`${MAPPING}/page`, data),
  detail: (id: string) =>
    http.post<TrainingObjectiveRequirementVO>(`${MAPPING}/detail`, { id }),
  create: (data: TrainingObjectiveRequirementSaveRequest) =>
    http.post<string>(`${MAPPING}/create`, data),
  update: (data: TrainingObjectiveRequirementSaveRequest) =>
    http.post<void>(`${MAPPING}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${MAPPING}/delete`, { id }),
}
