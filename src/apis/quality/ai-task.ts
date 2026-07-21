import type {
  AiManualHandlingStatusCode,
  AiTaskBusinessTypeCode,
  AiTaskFailurePhaseCode,
  AiTaskStatusCode,
  AiTaskTypeCode,
} from './types'
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
/**
 * AI 异步任务主表 API
 *
 * 后端路径:
 * - /api/quality/ai-tasks          AI 任务主表（detail / page / cancel）
 *
 * 任务触发   → ai-task-trigger.ts
 * 任务结果   → ai-result.ts
 * 模型配置   → ai-model-profile.ts
 * 脱敏映射   → ai-mask-mapping.ts
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const TASK = '/api/quality/ai-tasks'

/** AI 任务 VO - 严格对齐后端 AiTaskVO */
export interface AiTaskVO {
  id: string
  tenantId?: string
  operatorUserId?: string
  operatorUserName?: string
  taskType: AiTaskTypeCode
  businessType: AiTaskBusinessTypeCode
  businessId: string
  businessLabel?: string
  /** 关联专业评价口径 ID；存在时后端必须同步返回 programName。 */
  programId?: string
  /** 关联专业名称，由后端按 programId 从专业评价口径装配。 */
  programName?: string
  /** 关联培养方案 ID；存在时后端必须同步返回 trainingPlanCode / trainingPlanName。 */
  trainingPlanId?: string
  /** 培养方案编码，由后端按 trainingPlanId 从培养方案主数据装配。 */
  trainingPlanCode?: string
  /** 培养方案名称，由后端按 trainingPlanId 从培养方案主数据装配。 */
  trainingPlanName?: string
  /** 关联质量课程 ID；存在时后端必须同步返回 qualityCourseCode / qualityCourseName。 */
  qualityCourseId?: string
  /** 质量课程编码，由后端按 qualityCourseId 从质量课程主数据装配。 */
  qualityCourseCode?: string
  /** 质量课程名称，由后端按 qualityCourseId 从质量课程主数据装配。 */
  qualityCourseName?: string
  /** 关联达成度结果 ID；存在时后端必须同步返回 achievementResultLabel。 */
  achievementResultId?: string
  /** 达成度结果展示标签，由后端按 achievementResultId 装配。 */
  achievementResultLabel?: string
  /** 关联质量报告 ID；存在时后端必须同步返回 reportTitle。 */
  reportId?: string
  /** 质量报告标题，由后端按 reportId 装配。 */
  reportTitle?: string
  status: AiTaskStatusCode
  failurePhase?: AiTaskFailurePhaseCode
  failureReason?: string
  maskMappingId?: string
  resultId?: string
  startedTime?: string
  finishedTime?: string
  manualHandlingStatus: AiManualHandlingStatusCode
  manualHandlingRemark?: string
  createTime?: string
  updateTime?: string
}

/** AI 任务分页查询请求 - 严格对齐后端 AiTaskQueryRequest */
export interface AiTaskQueryRequest extends QueryDto {
  operatorUserId?: string
  taskType?: AiTaskTypeCode
  taskTypes?: AiTaskTypeCode[]
  businessType?: AiTaskBusinessTypeCode
  businessId?: string
  status?: AiTaskStatusCode
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
}

/** AI 任务创建请求 - 对齐后端 AiTaskCreateRequest */
export interface AiTaskCreateRequest {
  taskType: AiTaskTypeCode
  businessType: AiTaskBusinessTypeCode
  businessId: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
}

/** AI 任务抢占请求 - 对齐后端 AiTaskClaimRequest */
export interface AiTaskClaimRequest {
  id: string
}

/** AI 任务完成登记请求 - 对齐后端 AiTaskCompleteRequest */
export interface AiTaskCompleteRequest {
  id: string
  promptSnapshotId: string
  maskMappingId: string
  resultId: string
}

/** AI 任务失败登记请求 - 对齐后端 AiTaskFailRequest */
export interface AiTaskFailRequest {
  id: string
  failurePhase: AiTaskFailurePhaseCode
  failureReason: string
  promptSnapshotId?: string
  maskMappingId?: string
  resultId?: string
}

/** AI 人工处置请求 - 严格对齐后端 AiTaskManualHandlingRequest */
export interface AiTaskManualHandlingRequest {
  id: string
  manualHandlingStatus: AiManualHandlingStatusCode
  manualHandlingRemark?: string
}

/** AI 任务取消请求 - 对齐后端 AiTaskCancelRequest */
export interface AiTaskCancelRequest {
  id: string
  reason: string
}

/** AI 任务按状态统计 - 对齐后端 QualityStatusCountsResponse */
export interface QualityStatusCountsResponse {
  totalCount: number
  statusCounts: Array<{ status: AiTaskStatusCode, recordCount: number }>
}

export const aiTaskApi = {
  create: (data: AiTaskCreateRequest) => http.post<string>(`${TASK}/create`, data),
  page: (data: AiTaskQueryRequest, config?: ExtendedAxiosRequestConfig) =>
    http.post<PageResult<AiTaskVO>>(`${TASK}/page`, data, config),
  statusCounts: (data: AiTaskQueryRequest, config?: ExtendedAxiosRequestConfig) =>
    http.post<QualityStatusCountsResponse>(`${TASK}/status-counts`, data, config),
  detail: (id: string) => http.post<AiTaskVO>(`${TASK}/detail`, { id }),
  claim: (data: AiTaskClaimRequest) => http.post<void>(`${TASK}/claim`, data),
  complete: (data: AiTaskCompleteRequest) => http.post<void>(`${TASK}/complete`, data),
  fail: (data: AiTaskFailRequest) => http.post<void>(`${TASK}/fail`, data),
  cancel: (data: AiTaskCancelRequest) => http.post<void>(`${TASK}/cancel`, data),
  manualHandle: (data: AiTaskManualHandlingRequest) =>
    http.post<void>(`${TASK}/manual-handle`, data),
}
