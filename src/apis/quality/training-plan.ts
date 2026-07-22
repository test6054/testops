import type { ConfirmationStatusCode } from './types'
/**
 * 培养方案 API - 对接 edu-quality / TrainingPlanController
 *
 * 后端路径: /api/quality/training-plans
 */
import type { PageResult, QueryDto } from '@/types'
import type { TrainingPlanAiCandidateReviewStatusCode } from '@/types/enums/training-plan-ai-candidate-review-status-enum'
import type { TrainingPlanAiCandidateTypeCode } from '@/types/enums/training-plan-ai-candidate-type-enum'
import type { TrainingPlanStatusActionCode } from '@/types/enums/training-plan-status-action-enum'
import http from '@/config/axios'

const BASE = '/api/quality/training-plans'

/** 培养方案 VO - 严格对齐后端 TrainingPlanVO */
export interface TrainingPlanVO {
  id: string
  programId: string
  programName?: string
  planCode: string
  planName: string
  schoolYear: string
  gradeLevel?: string
  description?: string
  accreditationProfileId?: string
  accreditationProfileCode?: string
  accreditationProfileName?: string
  storageFileId?: string
  enabled: boolean
  confirmationStatus?: ConfirmationStatusCode
  confirmedUserId?: string
  confirmedTime?: string
  submittedAt?: string
  returnedAt?: string
  returnComment?: string
  revokedAt?: string
  revokeReason?: string
  statusVersion: number
  createTime?: string
  updateTime?: string
}

/** 培养方案状态机动作请求，必须携带详情读取到的乐观锁版本。 */
export interface TrainingPlanStatusTransitionRequest {
  id: string
  statusVersion: number
  comment?: string
}

/** 培养方案状态机动作结果。 */
export interface TrainingPlanStatusTransitionVO {
  id: string
  confirmationStatus: ConfirmationStatusCode
  statusVersion: number
  idempotent: boolean
  staleResultCount: number
}

/** 发布 Checklist 单项结果。 */
export interface TrainingPlanChecklistItemVO {
  code: string
  field: string
  passed: boolean
  message: string
}

/** 发布 Checklist 汇总。 */
export interface TrainingPlanChecklistVO {
  trainingPlanId: string
  passed: boolean
  items: TrainingPlanChecklistItemVO[]
  failedItems: TrainingPlanChecklistItemVO[]
}

/** AI 诊断中的单项修复建议。 */
export interface TrainingPlanDiagnosisSuggestionVO {
  checklistCode: string
  message: string
  suggestion: string
  deepLink: string
}

/** 基于 Checklist 的建设诊断与确认风险摘要。 */
export interface TrainingPlanDiagnosisVO {
  trainingPlanId: string
  checklistPassed: boolean
  summary: string
  riskSummary: string
  suggestions: TrainingPlanDiagnosisSuggestionVO[]
}

/** 培养方案院审状态审计记录。 */
export interface TrainingPlanStatusAuditVO {
  id: string
  trainingPlanId: string
  previousStatus: ConfirmationStatusCode
  currentStatus: ConfirmationStatusCode
  actionCode: TrainingPlanStatusActionCode
  comment?: string
  operatorUserId: string
  createTime: string
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
    confirmedUserId: plan.confirmedUserId
      ? normalizeTrainingPlanId(plan.confirmedUserId)
      : undefined,
  }
}

function normalizeTrainingPlanPage(result: PageResult<TrainingPlanVO>): PageResult<TrainingPlanVO> {
  return {
    ...result,
    list: result.list.map((item) => normalizeTrainingPlanVO(item)),
  }
}


/** 培养方案 AI 结构候选 VO - TrainingPlanAiCandidateVO */
export interface TrainingPlanAiCandidateVO {
  id: string
  trainingPlanId: string
  candidateType: TrainingPlanAiCandidateTypeCode
  candidatePayload?: string
  reviewStatus: TrainingPlanAiCandidateReviewStatusCode
  reviewComment?: string
  reviewedUserId?: string
  reviewedAt?: string
}

/** 培养方案 AI 候选人工确认/驳回请求 */
export interface TrainingPlanAiCandidateReviewRequest {
  candidateId: string
  reviewStatus: TrainingPlanAiCandidateReviewStatusCode
  reviewComment?: string
}

/** 培养方案 AI 候选审阅结果 */
export interface TrainingPlanAiCandidateReviewVO {
  candidateId: string
  trainingPlanId: string
  candidateType: TrainingPlanAiCandidateTypeCode
  reviewStatus: TrainingPlanAiCandidateReviewStatusCode
  idempotent?: boolean
  writtenCount?: number
}

export const trainingPlanApi = {
  page: async (data: TrainingPlanQueryRequest) =>
    normalizeTrainingPlanPage(await http.post<PageResult<TrainingPlanVO>>(`${BASE}/page`, data)),
  detail: async (id: string) =>
    normalizeTrainingPlanVO(
      await http.post<TrainingPlanVO>(`${BASE}/detail`, { id: normalizeTrainingPlanId(id) }),
    ),
  create: (data: TrainingPlanSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: TrainingPlanSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  checklist: (id: string) => http.post<TrainingPlanChecklistVO>(`${BASE}/checklist`, { id }),
  diagnose: (id: string) => http.post<TrainingPlanDiagnosisVO>(`${BASE}/diagnose`, { id }),
  statusAudits: (id: string) => http.post<TrainingPlanStatusAuditVO[]>(`${BASE}/status-audits`, { id }),
  submit: (data: TrainingPlanStatusTransitionRequest) =>
    http.post<TrainingPlanStatusTransitionVO>(`${BASE}/submit`, data),
  confirm: (data: TrainingPlanStatusTransitionRequest) =>
    http.post<TrainingPlanStatusTransitionVO>(`${BASE}/confirm`, data),
  returnForRevision: (data: TrainingPlanStatusTransitionRequest) =>
    http.post<TrainingPlanStatusTransitionVO>(`${BASE}/return`, data),
  revoke: (data: TrainingPlanStatusTransitionRequest) =>
    http.post<TrainingPlanStatusTransitionVO>(`${BASE}/revoke`, data),
  remindReview: (id: string) => http.post<number>(`${BASE}/remind-review`, { id }),
  listAiCandidates: (id: string) =>
    http.post<TrainingPlanAiCandidateVO[]>(`${BASE}/ai/candidates`, { id: normalizeTrainingPlanId(id) }),
  reviewAiCandidate: (data: TrainingPlanAiCandidateReviewRequest) =>
    http.post<TrainingPlanAiCandidateReviewVO>(`${BASE}/ai/candidates/review`, data),
}
