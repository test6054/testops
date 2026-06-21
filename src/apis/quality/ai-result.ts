import type { AiOutputValidation } from './types'
/**
 * AI 结果 API - 对齐 AiResultController。
 *
 * 后端路径：/api/quality/ai-results
 */
import http from '@/config/axios'

const BASE = '/api/quality/ai-results'

export type AiResultSeverity = 'HIGH' | 'MEDIUM' | 'LOW'
export type AiResultPriority = 'HIGH' | 'MEDIUM' | 'LOW'

/** AI 结果问题项 - 严格对齐后端 AiResultIssueItemVO */
export interface AiResultIssueItemVO {
  issueTitle: string
  issueDescription?: string
  severity?: AiResultSeverity
}

/** AI 结果证据项 - 严格对齐后端 AiResultEvidenceItemVO */
export interface AiResultEvidenceItemVO {
  evidenceTitle: string
  evidenceSource?: string
  evidenceContent: string
}

/** AI 结果改进项 - 严格对齐后端 AiResultImprovementItemVO */
export interface AiResultImprovementItemVO {
  suggestionTitle: string
  suggestionContent: string
  priority?: AiResultPriority
}

/** AI 结果 VO - 严格对齐后端 AiResultVO */
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

export const aiResultApi = {
  /** 创建 AI 结果（任务执行链路内部调用，前端审计场景一般不直接触发） */
  create: (data: AiResultSaveRequest) => http.post<string>(`${BASE}/create`, data),
  /** 查询 AI 结果详情 */
  detail: (id: string) => http.post<AiResultVO>(`${BASE}/detail`, { id }),
  /** 按 AI 任务查询结果；尚未生成时后端返回 null */
  getByTask: (aiTaskId: string) =>
    http.post<AiResultVO | null>(`${BASE}/get-by-task`, { id: aiTaskId }),
  /** 更新 AI 结果校验状态（接受 / 退回 AI 输出） */
  updateValidation: (data: AiResultValidationUpdateRequest) =>
    http.post<void>(`${BASE}/update-validation`, data),
}
