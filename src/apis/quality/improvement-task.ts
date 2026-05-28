import type { ImprovementTaskStatus } from './types'
/**
 * 持续改进任务 API - 对接 edu-quality / ImprovementTaskController
 *
 * 后端路径: /api/quality/improvement-tasks
 * 字段严格对齐 ImprovementTaskVO / ImprovementTaskSaveRequest /
 *   ImprovementTaskQueryRequest / ImprovementTaskStatusUpdateRequest /
 *   ImprovementTaskCloseRequest。
 *
 * 注意：AI 改进建议生成走 /api/quality/ai-task/submit，businessType=ACHIEVEMENT_RESULT，
 * achievementResultId 为任务锚点。
 * 本文件不再封装 trigger-ai-suggestion，由前端在 AI 任务中心或本页直接提交。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/improvement-tasks'

/** 持续改进任务 VO - 严格对齐后端 ImprovementTaskVO */
export interface ImprovementTaskVO {
  id: string
  tenantId?: string
  programId: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
  taskCode: string
  taskTitle: string
  problemSummary: string
  proposedAction: string
  ownerUserId: string
  ownerRole?: string
  /** yyyy-MM-dd */
  dueDate: string
  status: ImprovementTaskStatus
  progressRemark?: string
  /** 整改证据条目 */
  rectificationEvidenceItems?: string[]
  reviewDecision?: string
  reviewRemark?: string
  closedAt?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询 - 严格对齐后端 ImprovementTaskQueryRequest */
export interface ImprovementTaskQueryPayload extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  ownerUserId?: string
  status?: ImprovementTaskStatus
  keyword?: string
}

/** 保存请求 - 严格对齐后端 ImprovementTaskSaveRequest */
export interface ImprovementTaskSavePayload {
  id?: string
  programId: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
  taskCode?: string
  taskTitle: string
  problemSummary: string
  proposedAction: string
  ownerUserId: string
  ownerRole?: string
  /** yyyy-MM-dd */
  dueDate: string
}

/** 状态流转 - 严格对齐后端 ImprovementTaskStatusUpdateRequest */
export interface ImprovementTaskStatusUpdatePayload {
  id: string
  targetStatus: ImprovementTaskStatus
  progressRemark?: string
  /** 整改证据条目 */
  rectificationEvidenceItems?: string[]
}

/** 闭环复评 - 严格对齐后端 ImprovementTaskCloseRequest */
export interface ImprovementTaskClosePayload {
  id: string
  reviewDecision: string
  reviewRemark?: string
}

export const improvementTaskApi = {
  page: (data: ImprovementTaskQueryPayload) =>
    http.post<PageResult<ImprovementTaskVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<ImprovementTaskVO>(`${BASE}/detail`, { id }),
  create: (data: ImprovementTaskSavePayload) => http.post<string>(`${BASE}/create`, data),
  update: (data: ImprovementTaskSavePayload) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 状态流转：OPEN -> IN_PROGRESS -> SUBMITTED；RETURNED -> IN_PROGRESS */
  transitStatus: (data: ImprovementTaskStatusUpdatePayload) =>
    http.post<void>(`${BASE}/transit-status`, data),
  /** SUBMITTED → CLOSED / RETURNED 由 close 接口处理（包含复评结论） */
  close: (data: ImprovementTaskClosePayload) => http.post<void>(`${BASE}/close`, data),
}
