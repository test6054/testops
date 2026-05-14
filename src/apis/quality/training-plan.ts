/**
 * 培养方案 API - 对接 edu-quality / TrainingPlanController
 *
 * 后端路径: /api/quality/training-plans
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/training-plans'

/** 培养方案 VO - 严格对齐后端 TrainingPlanVO */
export interface TrainingPlanVO {
  id: string
  programId: string
  planCode: string
  planName: string
  schoolYear: string
  gradeLevel?: string
  description?: string
  accreditationProfileId?: string
  storageFileId?: string
  enabled: boolean
  confirmationStatus?: string
  confirmedBy?: string
  confirmedAt?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询请求 */
export interface TrainingPlanQueryPayload extends QueryDto {
  programId?: string
  schoolYear?: string
  gradeLevel?: string
  confirmationStatus?: string
  enabled?: boolean
  keyword?: string
}

/** 保存请求 - 严格对齐后端 TrainingPlanSaveRequest */
export interface TrainingPlanSavePayload {
  id?: string
  programId: string
  planCode: string
  planName: string
  schoolYear: string
  gradeLevel?: string
  description?: string
  accreditationProfileId?: string
  storageFileId?: string
  enabled?: boolean
}

export const trainingPlanApi = {
  page: (data: TrainingPlanQueryPayload) =>
    http.post<PageResult<TrainingPlanVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<TrainingPlanVO>(`${BASE}/detail`, { id }),
  create: (data: TrainingPlanSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: TrainingPlanSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
  confirm: (id: string) =>
    http.post<void>(`${BASE}/confirm`, { id }),
}
