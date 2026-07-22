import type { ImprovementTaskStatusCode } from './types'
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
/**
 * 持续改进任务 API - 对接 edu-quality / ImprovementTaskController
 *
 * 后端路径: /api/quality/improvement-tasks
 * 字段严格对齐 ImprovementTaskVO / ImprovementTaskSaveRequest /
 *   ImprovementTaskQueryRequest / ImprovementTaskStatusUpdateRequest /
 *   ImprovementTaskCloseRequest。
 *
 * AI 改进草稿生成通过 ai-task-trigger.ts 显式提交，不混入保存请求。
 */
import type { PageResult, QueryDto } from '@/types'
import type { ImprovementTaskReviewDecisionCode } from '@/types/enums/improvement-task-review-decision-enum'
import http from '@/config/axios'

const BASE = '/api/quality/improvement-tasks'

/** 持续改进任务 VO - 严格对齐后端 ImprovementTaskVO */
export interface ImprovementTaskVO {
  id: string
  tenantId?: string
  programId?: string
  programName?: string
  trainingPlanId?: string
  trainingPlanCode?: string
  trainingPlanName?: string
  qualityCourseId?: string
  qualityCourseCode?: string
  qualityCourseName?: string
  achievementResultId?: string
  achievementResultLabel?: string
  reportId?: string
  reportTitle?: string
  taskCode: string
  taskTitle: string
  problemSummary: string
  proposedAction: string
  ownerUserId?: string
  /** 责任人用户名称，ownerUserId 非空时后端必填 */
  ownerUserName?: string
  ownerRole?: string
  /** yyyy-MM-dd */
  dueDate?: string
  status: ImprovementTaskStatusCode
  progressRemark?: string
  /** 整改证据条目 */
  rectificationEvidenceItems?: string[]
  reviewDecision?: ImprovementTaskReviewDecisionCode
  reviewRemark?: string
  closedTime?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询 - 严格对齐后端 ImprovementTaskQueryRequest */
export interface ImprovementTaskQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  ownerUserId?: string
  status?: ImprovementTaskStatusCode
  keyword?: string
}

/** 保存请求 - 严格对齐后端 ImprovementTaskSaveRequest */
export interface ImprovementTaskSaveRequest {
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
  /** yyyy-MM-dd，后端 @NotNull */
  dueDate: string
}

/** 状态流转 - 严格对齐后端 ImprovementTaskStatusUpdateRequest */
export interface ImprovementTaskStatusUpdateRequest {
  id: string
  targetStatus: ImprovementTaskStatusCode
  progressRemark?: string
  /** 整改证据条目 */
  rectificationEvidenceItems?: string[]
}

/** 闭环复评 - 严格对齐后端 ImprovementTaskCloseRequest */
export interface ImprovementTaskCloseRequest {
  id: string
  reviewDecision: ImprovementTaskReviewDecisionCode
  reviewRemark?: string
}

export const improvementTaskApi = {
  page: (data: ImprovementTaskQueryRequest, config?: ExtendedAxiosRequestConfig) =>
    http.post<PageResult<ImprovementTaskVO>>(`${BASE}/page`, data, config),
  detail: (id: string) => http.post<ImprovementTaskVO>(`${BASE}/detail`, { id }),
  create: (data: ImprovementTaskSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ImprovementTaskSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 状态流转：OPEN -> IN_PROGRESS -> SUBMITTED；RETURNED -> IN_PROGRESS */
  transitStatus: (data: ImprovementTaskStatusUpdateRequest) =>
    http.post<void>(`${BASE}/transit-status`, data),
  /** SUBMITTED → CLOSED / RETURNED 由 close 接口处理（包含复评结论） */
  close: (data: ImprovementTaskCloseRequest) => http.post<void>(`${BASE}/close`, data),
}
