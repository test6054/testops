import type {
  AiHealthStatus,
  AiManualHandlingStatus,
  AiOutputValidation,
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
 * 提示词快照 → ai-prompt-snapshot.ts
 * 脱敏映射   → ai-mask-mapping.ts
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { isAiHealthStatus, isAiManualHandlingStatus, isAiTaskStatus, isAiTaskType } from './types'

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
  manualHandlingStatus: AiManualHandlingStatus
  manualHandlingRemark?: string
  createTime?: string
  updateTime?: string
}

/** AI 结果 VO - 严格对齐后端 AiResultVO */
export interface AiResultIssueItemVO {
  issueTitle: string
  issueDescription?: string
  severity?: string
}

export interface AiResultEvidenceItemVO {
  evidenceTitle: string
  evidenceSource?: string
  evidenceContent: string
}

export interface AiResultImprovementItemVO {
  suggestionTitle: string
  suggestionContent: string
  priority?: string
}

export interface AiResultVO {
  id: string
  tenantId?: string
  aiTaskId: string
  /** 诊断摘要 */
  summary?: string
  /** 问题清单 */
  issueItems?: AiResultIssueItemVO[]
  /** 证据引用 */
  evidenceItems?: AiResultEvidenceItemVO[]
  /** 改进建议 */
  improvementItems?: AiResultImprovementItemVO[]
  /** 报告正文文本 */
  reportBody?: string
  /** 结构 / 证据 / 敏感综合校验状态 */
  outputValidation?: AiOutputValidation
  /** 敏感信息校验状态：运行时取值 CLEAN / LEAK_DETECTED */
  sensitiveCheckStatus?: string
  /** 敏感信息校验明细文本 */
  sensitiveCheckDetail?: string
  /** 业务快照锚点 */
  businessSnapshotAnchor?: string
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
 * abilityCode / defaultProfile 不属于当前后端下行契约。
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
  healthStatus?: AiHealthStatus
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

/** AI 人工处置请求 - 对齐后端 AiTaskManualHandlingRequest */
export interface AiTaskManualHandlePayload {
  id: string
  manualHandlingStatus: AiManualHandlingStatus
  manualHandlingRemark?: string
}

/** AI 结果保存请求 - 严格对齐后端 AiResultSaveRequest */
export interface AiResultSavePayload {
  aiTaskId: string
  summary?: string
  issueItems?: AiResultIssueItemVO[]
  evidenceItems?: AiResultEvidenceItemVO[]
  improvementItems?: AiResultImprovementItemVO[]
  reportBody?: string
  outputValidation: AiOutputValidation
  sensitiveCheckStatus?: string
  sensitiveCheckDetail?: string
  businessSnapshotAnchor?: string
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
 * 后端继承 QueryDto，分页字段必传；仅支持 enabledOnly 过滤，不再接收 abilityCode / defaultProfile / keyword 。
 */
export interface AiModelProfileQueryPayload extends QueryDto {
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
  healthStatus: AiHealthStatus
  /** 健康检查诊断消息 */
  healthMessage: string
  /** 模型原始返回摘要（截断后） */
  responseSummary?: string
}

function assertRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName}必须是对象`)
  }
  return value as Record<string, unknown>
}

function requireString(record: Record<string, unknown>, key: string, fieldName: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName}不能为空`)
  }
  return value
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  fieldName: string,
): string | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName}必须是字符串`)
  }
  return value
}

function requireAiTaskStatus(record: Record<string, unknown>, key: string): AiTaskStatus {
  const value = record[key]
  if (isAiTaskStatus(value)) return value
  throw new Error(`AI 任务状态存在未定义枚举值：${String(value)}`)
}

function requireAiTaskType(record: Record<string, unknown>, key: string): AiTaskType {
  const value = record[key]
  if (isAiTaskType(value)) return value
  throw new Error(`AI 任务类型存在未定义枚举值：${String(value)}`)
}

function requireAiManualHandlingStatus(
  record: Record<string, unknown>,
  key: string,
): AiManualHandlingStatus {
  const value = record[key]
  if (isAiManualHandlingStatus(value)) return value
  throw new Error(`AI 人工处置状态存在未定义枚举值：${String(value)}`)
}

function requireAiHealthStatus(record: Record<string, unknown>, key: string): AiHealthStatus {
  const value = record[key]
  if (isAiHealthStatus(value)) return value
  throw new Error(`AI 模型健康状态存在未定义枚举值：${String(value)}`)
}

function validateAiTaskDetail(payload: unknown): AiTaskVO {
  const record = assertRecord(payload, 'AI 任务详情')
  const status = requireAiTaskStatus(record, 'status')
  const failureReason = optionalString(record, 'failureReason', 'AI 任务详情.failureReason')
  if (status === 'FAILED' && !failureReason) {
    throw new Error('AI 任务失败时必须返回 failureReason')
  }
  return {
    id: requireString(record, 'id', 'AI 任务详情.id'),
    tenantId: optionalString(record, 'tenantId', 'AI 任务详情.tenantId'),
    operatorUserId: optionalString(record, 'operatorUserId', 'AI 任务详情.operatorUserId'),
    taskType: requireAiTaskType(record, 'taskType'),
    businessType: optionalString(record, 'businessType', 'AI 任务详情.businessType'),
    businessId: optionalString(record, 'businessId', 'AI 任务详情.businessId'),
    programId: optionalString(record, 'programId', 'AI 任务详情.programId'),
    trainingPlanId: optionalString(record, 'trainingPlanId', 'AI 任务详情.trainingPlanId'),
    qualityCourseId: optionalString(record, 'qualityCourseId', 'AI 任务详情.qualityCourseId'),
    achievementResultId: optionalString(
      record,
      'achievementResultId',
      'AI 任务详情.achievementResultId',
    ),
    reportId: optionalString(record, 'reportId', 'AI 任务详情.reportId'),
    status,
    failurePhase: optionalString(record, 'failurePhase', 'AI 任务详情.failurePhase'),
    failureReason,
    businessSnapshotAnchor: optionalString(
      record,
      'businessSnapshotAnchor',
      'AI 任务详情.businessSnapshotAnchor',
    ),
    maskedInputAnchor: optionalString(record, 'maskedInputAnchor', 'AI 任务详情.maskedInputAnchor'),
    promptSnapshotId: optionalString(record, 'promptSnapshotId', 'AI 任务详情.promptSnapshotId'),
    maskMappingId: optionalString(record, 'maskMappingId', 'AI 任务详情.maskMappingId'),
    resultId: optionalString(record, 'resultId', 'AI 任务详情.resultId'),
    startedAt: optionalString(record, 'startedAt', 'AI 任务详情.startedAt'),
    finishedAt: optionalString(record, 'finishedAt', 'AI 任务详情.finishedAt'),
    manualHandlingStatus: requireAiManualHandlingStatus(record, 'manualHandlingStatus'),
    manualHandlingRemark: optionalString(
      record,
      'manualHandlingRemark',
      'AI 任务详情.manualHandlingRemark',
    ),
    createTime: optionalString(record, 'createTime', 'AI 任务详情.createTime'),
    updateTime: optionalString(record, 'updateTime', 'AI 任务详情.updateTime'),
  }
}

function validateAiModelProfileHealthCheck(payload: unknown): AiModelProfileHealthCheckVO {
  const record = assertRecord(payload, 'AI 模型健康检查响应')
  return {
    profileId: requireString(record, 'profileId', 'AI 模型健康检查响应.profileId'),
    healthStatus: requireAiHealthStatus(record, 'healthStatus'),
    healthMessage: requireString(record, 'healthMessage', 'AI 模型健康检查响应.healthMessage'),
    responseSummary: optionalString(
      record,
      'responseSummary',
      'AI 模型健康检查响应.responseSummary',
    ),
  }
}

export const aiTaskApi = {
  page: (data: AiTaskQueryPayload) => http.post<PageResult<AiTaskVO>>(`${TASK}/page`, data),
  detail: (id: string) => http.post<unknown>(`${TASK}/detail`, { id }).then(validateAiTaskDetail),
  submit: (data: AiTaskSubmitPayload) =>
    http.post<AiTaskSubmitResponseVO>(`${TRIGGER}/submit`, data),
  runNow: (id: string) => http.post<void>(`${TRIGGER}/run-now`, { id }),
  cancel: (id: string, reason?: string) => http.post<void>(`${TASK}/cancel`, { id, reason }),
  manualHandle: (data: AiTaskManualHandlePayload) => http.post<void>(`${TASK}/manual-handle`, data),
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
  /** 列表分页查询 */
  list: (data: AiModelProfileQueryPayload) =>
    http.post<PageResult<AiModelProfileVO>>(`${MODEL}/list`, data),
  /** 新建或更新 */
  save: (data: AiModelProfileSavePayload) => http.post<string>(`${MODEL}/save`, data),
  /** 健康检查 */
  healthCheck: (data: AiModelProfileHealthCheckPayload) =>
    http.post<unknown>(`${MODEL}/health-check`, data).then(validateAiModelProfileHealthCheck),
}
