import type { ConfirmationStatusCode } from './types'
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
  confirmationStatus?: ConfirmationStatusCode
  confirmedUserId?: string
  confirmedTime?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询请求 */
export interface TrainingPlanQueryRequest extends QueryDto {
  programId?: string
  schoolYear?: string
  gradeLevel?: string
  confirmationStatus?: ConfirmationStatusCode
  enabled?: boolean
  keyword?: string
}

/** 保存请求 - 严格对齐后端 TrainingPlanSaveRequest */
export interface TrainingPlanSaveRequest {
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

/** Wire 层 Long 可能以 number 到达，统一归一为 string 供 Select / Store 比较。 */
export function normalizeTrainingPlanId(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return String(value)
}

/** 归一培养方案 VO 主键与关联 ID，避免 a-select 值类型漂移。 */
export function normalizeTrainingPlanVO(plan: TrainingPlanVO): TrainingPlanVO {
  return {
    ...plan,
    id: normalizeTrainingPlanId(plan.id),
    programId: normalizeTrainingPlanId(plan.programId),
    accreditationProfileId: plan.accreditationProfileId
      ? normalizeTrainingPlanId(plan.accreditationProfileId)
      : undefined,
    storageFileId: plan.storageFileId ? normalizeTrainingPlanId(plan.storageFileId) : undefined,
    confirmedUserId: plan.confirmedUserId ? normalizeTrainingPlanId(plan.confirmedUserId) : undefined,
  }
}

function normalizeTrainingPlanPage(result: PageResult<TrainingPlanVO>): PageResult<TrainingPlanVO> {
  return {
    ...result,
    list: result.list.map((item) => normalizeTrainingPlanVO(item)),
  }
}

export const trainingPlanApi = {
  page: async (data: TrainingPlanQueryRequest) =>
    normalizeTrainingPlanPage(await http.post<PageResult<TrainingPlanVO>>(`${BASE}/page`, data)),
  detail: async (id: string) =>
    normalizeTrainingPlanVO(await http.post<TrainingPlanVO>(`${BASE}/detail`, { id: normalizeTrainingPlanId(id) })),
  create: (data: TrainingPlanSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: TrainingPlanSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  confirm: (id: string) => http.post<void>(`${BASE}/confirm`, { id }),
  revoke: (id: string) => http.post<void>(`${BASE}/revoke`, { id }),
}
