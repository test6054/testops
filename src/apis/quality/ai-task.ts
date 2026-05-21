import type { AiOutputValidation, AiTaskStatus, AiTaskType } from './types'
/**
 * AI 异步任务 / 结果 / 模型配置 API
 *
 * 后端路径:
 * - /api/quality/ai-tasks          AI 任务主表（detail / page / cancel）
 * - /api/quality/ai-task/submit    AI 任务提交（注意单数前缀）
 * - /api/quality/ai-task/run-now   立即同步执行（演示 / 运维）
 * - /api/quality/ai-results        AI 结果（create / detail / get-by-task / update-validation）
 * - /api/quality/ai/model-profiles AI 模型配置（save / list / health-check）
 *
 * 提示词快照 → ai-prompt-snapshot.ts
 * 脱敏映射   → ai-mask-mapping.ts
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const TASK = '/api/quality/ai-tasks'
const TRIGGER = '/api/quality/ai-task'
const RESULT = '/api/quality/ai-results'
const MODEL = '/api/quality/ai/model-profiles'

/** AI 任务 VO - 严格对齐后端 AiTaskVO */
export interface AiTaskVO {
  id: string
  tenantId?: string
  operatorUserId?: string
  taskType: AiTaskType
  businessType?: string
  businessId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
  status: AiTaskStatus
  failurePhase?: string
  failureReason?: string
  businessSnapshotAnchor?: string
  maskedInputAnchor?: string
  promptSnapshotId?: string
  maskMappingId?: string
  resultId?: string
  startedAt?: string
  finishedAt?: string
  manualHandlingStatus?: string
  manualHandlingRemark?: string
  createTime?: string
  updateTime?: string
}

/** AI 结果 VO - 严格对齐后端 AiResultVO */
export interface AiResultVO {
  id: string
  tenantId?: string
  aiTaskId: string
  /** 诊断摘要 */
  summary?: string
  /** 问题列表（JSON 字符串） */
  issueList?: string
  /** 证据引用（JSON 字符串） */
  evidenceReferences?: string
  /** 改进建议（JSON 字符串） */
  improvementSuggestions?: string
  /** 报告正文（Markdown） */
  reportBody?: string
  /** 结构 / 证据 / 敏感综合校验状态 */
  outputValidation?: AiOutputValidation
  /** 敏感信息校验状态：运行时取值 CLEAN / LEAK_DETECTED */
  sensitiveCheckStatus?: string
  /** 敏感信息校验明细（JSON 字符串） */
  sensitiveCheckDetail?: string
  /** 业务快照锚点 */
  businessSnapshotAnchor?: string
  /** 原始模型输出（脱敏后） */
  rawModelOutput?: string
  /** 调用模型名 */
  modelName?: string
  /** 提示 token 数 */
  promptTokenCount?: number
  /** 完成 token 数 */
  completionTokenCount?: number
  /** 生成时间 */
  generatedAt?: string
  createTime?: string
  updateTime?: string
}

/**
 * AI 模型配置 VO - 对齐后端 AiModelProfileVO。
 *
 * 业务规则：同一租户全局只能有一条 enabled=true 记录。
 * abilityCode / defaultProfile 字段已废弃，不再从后端下行。
 */
export interface AiModelProfileVO {
  id: string
  profileName: string
  providerType: string
  modelName: string
  apiHost?: string
  /** API Key 不下行；后端响应隐藏明文，仅保留 apiKeyConfigured 标志 */
  apiKeyConfigured?: boolean
  temperature?: number
  maxTokens?: number
  connectTimeoutSecs?: number
  readTimeoutSecs?: number
  enabled?: boolean
  healthStatus?: string
  lastHealthCheckAt?: string
  lastHealthMessage?: string
}

/** AI 任务分页查询请求 - 严格对齐后端 AiTaskQueryRequest */
export interface AiTaskQueryPayload extends QueryDto {
  operatorUserId?: string
  taskType?: AiTaskType
  businessType?: string
  businessId?: string
  status?: AiTaskStatus
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  reportId?: string
}

/**
 * AI 任务提交请求 - 严格对齐后端 AiTaskSubmitRequest
 * 后端端点：QualityAiTaskTriggerController#submit
 */
export interface AiTaskSubmitPayload {
  taskType: AiTaskType
  businessType?: string
  businessId?: string
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
  status: string
}

/** AI 结果保存请求 - 严格对齐后端 AiResultSaveRequest */
export interface AiResultSavePayload {
  aiTaskId: string
  summary?: string
  issueList?: string
  evidenceReferences?: string
  improvementSuggestions?: string
  reportBody?: string
  outputValidation: AiOutputValidation
  sensitiveCheckStatus?: string
  sensitiveCheckDetail?: string
  businessSnapshotAnchor?: string
  rawModelOutput?: string
  modelName: string
  promptTokenCount?: number
  completionTokenCount?: number
  generatedAt?: string
}

/** AI 结果校验状态更新请求 - 严格对齐后端 AiResultValidationUpdateRequest */
export interface AiResultValidationUpdatePayload {
  id: string
  outputValidation: AiOutputValidation
  sensitiveCheckStatus?: string
  sensitiveCheckDetail?: string
}

/**
 * AI 模型配置查询请求 - 对齐后端 AiModelProfileQueryRequest。
 * 后端仅支持 enabledOnly 过滤，不再接收 abilityCode / defaultProfile / keyword 。
 */
export interface AiModelProfileQueryPayload {
  /** true 仅返回当前启用的唯一配置 */
  enabledOnly?: boolean
}

/**
 * AI 模型配置保存请求 - 对齐后端 AiModelProfileSaveRequest。
 *
 * 业务规则：提交 enabled=true 后端会按 tenantId advisory lock 串行化并将
 * 同租户其他配置置为停用；apiKey 留空表示保留原密钥。
 */
export interface AiModelProfileSavePayload {
  id?: string
  profileName: string
  providerType: string
  modelName: string
  apiHost?: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  connectTimeoutSecs?: number
  readTimeoutSecs?: number
  enabled?: boolean
}

/**
 * 健康检查请求 - 对齐后端 AiModelProfileHealthCheckRequest。
 * 后端仅接收 profileId；abilityCode / promptOverride 字段不参与模型选择。
 */
export interface AiModelProfileHealthCheckPayload {
  profileId: string
}

/** 健康检查响应 - 对齐后端 AiModelProfileHealthCheckVO */
export interface AiModelProfileHealthCheckVO {
  profileId: string
  /** UNKNOWN / HEALTHY / FAILED */
  healthStatus: string
  /** 健康检查诊断消息 */
  healthMessage?: string
  /** 模型原始返回摘要（截断后） */
  responseSummary?: string
}

export const aiTaskApi = {
  page: (data: AiTaskQueryPayload) => http.post<PageResult<AiTaskVO>>(`${TASK}/page`, data),
  detail: (id: string) => http.post<AiTaskVO>(`${TASK}/detail`, { id }),
  submit: (data: AiTaskSubmitPayload) =>
    http.post<AiTaskSubmitResponseVO>(`${TRIGGER}/submit`, data),
  runNow: (id: string) => http.post<void>(`${TRIGGER}/run-now`, { id }),
  cancel: (id: string, reason?: string) => http.post<void>(`${TASK}/cancel`, { id, reason }),
}

export const aiResultApi = {
  /** 创建 AI 结果（任务执行链路内部调用，前端审计场景一般不直接触发） */
  create: (data: AiResultSavePayload) => http.post<string>(`${RESULT}/create`, data),
  /** 查询 AI 结果详情 */
  detail: (id: string) => http.post<AiResultVO>(`${RESULT}/detail`, { id }),
  /** 按 AI 任务查询结果；尚未生成时后端返回 null */
  getByTask: (aiTaskId: string) =>
    http.post<AiResultVO | null>(`${RESULT}/get-by-task`, { id: aiTaskId }),
  /** 更新 AI 结果校验状态（接受 / 退回 AI 输出） */
  updateValidation: (data: AiResultValidationUpdatePayload) =>
    http.post<void>(`${RESULT}/update-validation`, data),
}

export const aiModelProfileApi = {
  /** 列表查询（后端不分页） */
  list: (data?: AiModelProfileQueryPayload) =>
    http.post<AiModelProfileVO[]>(`${MODEL}/list`, data || {}),
  /** 新建或更新 */
  save: (data: AiModelProfileSavePayload) => http.post<string>(`${MODEL}/save`, data),
  /** 健康检查 */
  healthCheck: (data: AiModelProfileHealthCheckPayload) =>
    http.post<AiModelProfileHealthCheckVO>(`${MODEL}/health-check`, data),
}
