/**
 * 培养目标 + 培养目标-毕业要求映射 API
 *
 * 后端路径：
 * - /api/quality/training-objectives                   培养目标 CRUD
 * - /api/quality/training-objective-requirements       培养目标 ↔ 毕业要求权重映射
 *
 * 权重约束（数据维护方负责）：同一培养目标下所有映射 weight 之和应 ≈ 1。
 */
import http from '@/config/axios'

const OBJECTIVE = '/api/quality/training-objectives'
const MAPPING = '/api/quality/training-objective-requirements'

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

export interface TrainingObjectiveSaveRequest {
  id?: string
  trainingPlanId: string
  objectiveCode: string
  objectiveName: string
  description?: string
  sortOrder?: number
}

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

export interface TrainingObjectiveRequirementSaveRequest {
  id?: string
  trainingObjectiveId: string
  graduationRequirementId: string
  weight: number
  sortOrder?: number
  notes?: string
}

export const trainingObjectiveApi = {
  listByPlan: (trainingPlanId: string) =>
    http.post<TrainingObjectiveVO[]>(`${OBJECTIVE}/list-by-plan`, { id: trainingPlanId }),
  detail: (id: string) =>
    http.post<TrainingObjectiveVO>(`${OBJECTIVE}/detail`, { id }),
  create: (data: TrainingObjectiveSaveRequest) =>
    http.post<string>(`${OBJECTIVE}/create`, data),
  update: (data: TrainingObjectiveSaveRequest) =>
    http.post<void>(`${OBJECTIVE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${OBJECTIVE}/delete`, { id }),
}

export const trainingObjectiveRequirementApi = {
  listByObjective: (trainingObjectiveId: string) =>
    http.post<TrainingObjectiveRequirementVO[]>(`${MAPPING}/list-by-objective`, { id: trainingObjectiveId }),
  listByPlan: (trainingPlanId: string) =>
    http.post<TrainingObjectiveRequirementVO[]>(`${MAPPING}/list-by-plan`, { id: trainingPlanId }),
  detail: (id: string) =>
    http.post<TrainingObjectiveRequirementVO>(`${MAPPING}/detail`, { id }),
  create: (data: TrainingObjectiveRequirementSaveRequest) =>
    http.post<string>(`${MAPPING}/create`, data),
  update: (data: TrainingObjectiveRequirementSaveRequest) =>
    http.post<void>(`${MAPPING}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${MAPPING}/delete`, { id }),
}
