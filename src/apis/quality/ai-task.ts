import type {
  AiManualHandlingStatus,
  AiTaskBusinessType,
  AiTaskStatus,
  AiTaskType,
} from './types'
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
  operatorUserName: string
  taskType: AiTaskType
  businessType: AiTaskBusinessType
  businessId: string
  businessLabel: string
  /** 关联专业评价口径 ID；存在时后端必须同步返回 programName。 */
  programId?: string
  /** 关联专业名称，由后端按 programId 从专业评价口径装配。 */
  programName: string
  /** 关联培养方案 ID；存在时后端必须同步返回 trainingPlanCode / trainingPlanName。 */
  trainingPlanId?: string
  /** 培养方案编码，由后端按 trainingPlanId 从培养方案主数据装配。 */
  trainingPlanCode: string
  /** 培养方案名称，由后端按 trainingPlanId 从培养方案主数据装配。 */
  trainingPlanName: string
  /** 关联质量课程 ID；存在时后端必须同步返回 qualityCourseCode / qualityCourseName。 */
  qualityCourseId?: string
  /** 质量课程编码，由后端按 qualityCourseId 从质量课程主数据装配。 */
  qualityCourseCode: string
  /** 质量课程名称，由后端按 qualityCourseId 从质量课程主数据装配。 */
  qualityCourseName: string
  /** 关联达成度结果 ID；存在时后端必须同步返回 achievementResultLabel。 */
  achievementResultId?: string
  /** 达成度结果展示标签，由后端按 achievementResultId 装配。 */
  achievementResultLabel: string
  /** 关联质量报告 ID；存在时后端必须同步返回 reportTitle。 */
  reportId?: string
  /** 质量报告标题，由后端按 reportId 装配。 */
  reportTitle: string
  status: AiTaskStatus
  failurePhase?: string
  failureReason?: string
  maskMappingId?: string
  resultId?: string
  startedAt?: string
  finishedAt?: string
  manualHandlingStatus: AiManualHandlingStatus
  manualHandlingRemark?: string
  createTime?: string
  updateTime?: string
}

/** AI 任务分页查询请求 - 严格对齐后端 AiTaskQueryRequest */
export interface AiTaskQueryRequest extends QueryDto {
  operatorUserId?: string
  taskType?: AiTaskType
  businessType?: AiTaskBusinessType
  businessId?: string
  status?: AiTaskStatus
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
}

/** AI 人工处置请求 - 对齐后端 AiTaskManualHandlingRequest */
export interface AiTaskManualHandleRequest {
  id: string
  manualHandlingStatus: AiManualHandlingStatus
  manualHandlingRemark?: string
}

export const aiTaskApi = {
  page: (data: AiTaskQueryRequest) => http.post<PageResult<AiTaskVO>>(`${TASK}/page`, data),
  detail: (id: string) => http.post<AiTaskVO>(`${TASK}/detail`, { id }),
  cancel: (id: string, reason?: string) => http.post<void>(`${TASK}/cancel`, { id, reason }),
  manualHandle: (data: AiTaskManualHandleRequest) => http.post<void>(`${TASK}/manual-handle`, data),
}
