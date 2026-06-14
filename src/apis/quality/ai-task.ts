import type {
  AiHealthStatus,
  AiManualHandlingStatus,
  AiOutputValidation,
  AiProviderType,
  AiTaskBusinessType,
  AiTaskStatus,
  AiTaskType,
} from './types'
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
 * 脱敏映射   → ai-mask-mapping.ts
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const TASK = '/api/quality/ai-tasks'
const TRIGGER = '/api/quality/ai-task'
const RESULT = '/api/quality/ai-results'
const MODEL = '/api/quality/ai/model-profiles'

export type AiResultSeverity = 'HIGH' | 'MEDIUM' | 'LOW'
export type AiResultPriority = 'HIGH' | 'MEDIUM' | 'LOW'

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

/** AI 结果 VO - 严格对齐后端 AiResultVO */
export interface AiResultIssueItemVO {
  issueTitle: string
  issueDescription?: string
  severity?: AiResultSeverity
}

export interface AiResultEvidenceItemVO {
  evidenceTitle: string
  evidenceSource?: string
  evidenceContent: string
}

export interface AiResultImprovementItemVO {
  suggestionTitle: string
  suggestionContent: string
  priority?: AiResultPriority
}

export interface AiResultVO {
  id: string
  tenantId?: string
  aiTaskId: string
  /** AI 结果业务标题 */
  resultTitle: string
  /** 诊断摘要 */
  summary?: string
  /** 问题清单 */
  issueItems?: AiResultIssueItemVO[]
  /** 证据引用 */
  evidenceItems?: AiResultEvidenceItemVO[]
  /** 改进措施 */
  improvementItems?: AiResultImprovementItemVO[]
  /** 结构 / 证据 / 敏感综合校验状态 */
  outputValidation: AiOutputValidation
  /** 敏感信息校验状态：运行时取值 CLEAN / LEAK_DETECTED */
  sensitiveCheckStatus?: string
  /** 敏感信息校验明细文本 */
  sensitiveCheckDetail?: string
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
 * 业务规则：平台同一供应商最多一条 enabled=true 记录。
 * abilityCode / defaultProfile 不属于当前后端下行契约。
 */
export interface AiModelProfileVO {
  id: string
  profileName: string
  providerType: AiProviderType
  modelName: string
  apiHost: string
  /** API Key 普通列表不下行明文；后端仅返回配置状态 */
  apiKeyConfigured: boolean
  /** API Key 掩码；已配置时后端返回 ****，未配置时返回 null */
  apiKeyMasked: string | null
  temperature?: number
  maxTokens?: number
  maxInputChars: number
  connectTimeoutSecs?: number
  readTimeoutSecs?: number
  enabled?: boolean
  healthStatus?: AiHealthStatus
  lastHealthCheckAt?: string
  lastHealthMessage?: string
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

/** AI 人工处置请求 - 对齐后端 AiTaskManualHandlingRequest */
export interface AiTaskManualHandleRequest {
  id: string
  manualHandlingStatus: AiManualHandlingStatus
  manualHandlingRemark?: string
}

/** AI 结果保存请求 - 严格对齐后端 AiResultSaveRequest */
export interface AiResultSaveRequest {
  aiTaskId: string
  resultTitle: string
  summary?: string
  issueItems?: AiResultIssueItemVO[]
  evidenceItems?: AiResultEvidenceItemVO[]
  improvementItems?: AiResultImprovementItemVO[]
  outputValidation: AiOutputValidation
  sensitiveCheckStatus?: string
  sensitiveCheckDetail?: string
  modelName: string
  promptTokenCount?: number
  completionTokenCount?: number
  generatedAt?: string
}

/** AI 结果校验状态更新请求 - 严格对齐后端 AiResultValidationUpdateRequest */
export interface AiResultValidationUpdateRequest {
  id: string
  outputValidation: AiOutputValidation
  sensitiveCheckStatus?: string
  sensitiveCheckDetail?: string
}

/**
 * AI 模型配置查询请求 - 对齐后端 AiModelProfileQueryRequest。
 * 后端继承 QueryDto，分页字段必传；仅支持 enabledOnly 过滤，不接收 abilityCode / defaultProfile / keyword。
 */
export interface AiModelProfileQueryRequest extends QueryDto {
  /** true 仅返回当前启用的唯一配置 */
  enabledOnly?: boolean
}

/**
 * AI 模型配置保存请求 - 对齐后端 AiModelProfileSaveRequest。
 *
 * 业务规则：提交 enabled=true 后端会按 providerType advisory lock 串行化并将
 * 平台同供应商其他配置置为停用；apiKey 留空表示保留原密钥。
 */
export interface AiModelProfileSaveRequest {
  id?: string
  profileName: string
  providerType: AiProviderType
  modelName: string
  apiHost: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  maxInputChars: number
  connectTimeoutSecs?: number
  readTimeoutSecs?: number
  enabled?: boolean
}

/**
 * 健康检查请求 - 对齐后端 AiModelProfileHealthCheckRequest。
 * 后端仅接收 profileId；不再按租户或能力码参与模型选择。
 */
export interface AiModelProfileHealthCheckRequest {
  profileId: string
}

/** 健康检查响应 - 对齐后端 AiModelProfileHealthCheckVO */
export interface AiModelProfileHealthCheckVO {
  profileId: string
  /** UNKNOWN / HEALTHY / FAILED */
  healthStatus: AiHealthStatus
  /** 健康检查诊断消息 */
  healthMessage: string
  /** 模型处理摘要（截断后） */
  responseSummary?: string
}

export const aiTaskApi = {
  page: (data: AiTaskQueryRequest) => http.post<PageResult<AiTaskVO>>(`${TASK}/page`, data),
  detail: (id: string) => http.post<AiTaskVO>(`${TASK}/detail`, { id }),
  submit: (data: AiTaskSubmitRequest) =>
    http.post<AiTaskSubmitResponseVO>(`${TRIGGER}/submit`, data),
  runNow: (id: string) => http.post<void>(`${TRIGGER}/run-now`, { id }),
  cancel: (id: string, reason?: string) => http.post<void>(`${TASK}/cancel`, { id, reason }),
  manualHandle: (data: AiTaskManualHandleRequest) => http.post<void>(`${TASK}/manual-handle`, data),
}

export const aiResultApi = {
  /** 创建 AI 结果（任务执行链路内部调用，前端审计场景一般不直接触发） */
  create: (data: AiResultSaveRequest) => http.post<string>(`${RESULT}/create`, data),
  /** 查询 AI 结果详情 */
  detail: (id: string) => http.post<AiResultVO>(`${RESULT}/detail`, { id }),
  /** 按 AI 任务查询结果；尚未生成时后端返回 null */
  getByTask: (aiTaskId: string) =>
    http.post<AiResultVO | null>(`${RESULT}/get-by-task`, { id: aiTaskId }),
  /** 更新 AI 结果校验状态（接受 / 退回 AI 输出） */
  updateValidation: (data: AiResultValidationUpdateRequest) =>
    http.post<void>(`${RESULT}/update-validation`, data),
}

export const aiModelProfileApi = {
  /** 列表分页查询 */
  list: (data: AiModelProfileQueryRequest) =>
    http.post<PageResult<AiModelProfileVO>>(`${MODEL}/list`, data),
  /** 新建或更新 */
  save: (data: AiModelProfileSaveRequest) => http.post<string>(`${MODEL}/save`, data),
  /** 健康检查 */
  healthCheck: (data: AiModelProfileHealthCheckRequest) =>
    http.post<AiModelProfileHealthCheckVO>(`${MODEL}/health-check`, data),
}
