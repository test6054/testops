import type {
  AiTaskBusinessType,
  AiTaskStatus,
  AiTaskType,
} from './types'
/**
 * AI 任务提交与运维触发 API - 对齐 QualityAiTaskTriggerController。
 *
 * 后端路径：/api/quality/ai-task
 */
import http from '@/config/axios'

const BASE = '/api/quality/ai-task'

/**
 * AI 任务提交请求 - 严格对齐后端 AiTaskSubmitRequest
 * 后端端点：QualityAiTaskTriggerController#submit
 */
export interface AiTaskSubmitRequest {
  taskType: AiTaskType
  businessType: AiTaskBusinessType
  businessId: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
  fileNodeId?: string
  /** MATERIAL_QA 必填，最长 1000 字符 */
  question?: string
}

/** 提交响应 - 严格对齐后端 AiTaskSubmitVO */
export interface AiTaskSubmitResponseVO {
  taskId: string
  status: AiTaskStatus
}

/** AI 任务运维重置请求 - 对齐后端 AiTaskResetProcessingRequest */
export interface AiTaskResetProcessingRequest {
  id: string
  handlingRemark: string
}

export const aiTaskTriggerApi = {
  submit: (data: AiTaskSubmitRequest) =>
    http.post<AiTaskSubmitResponseVO>(`${BASE}/submit`, data),
  runNow: (id: string) => http.post<void>(`${BASE}/run-now`, { id }),
  resetProcessing: (data: AiTaskResetProcessingRequest) =>
    http.post<void>(`${BASE}/reset-processing`, data),
}
