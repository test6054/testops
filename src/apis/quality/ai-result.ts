import type { AiOutputValidationCode, AiSensitiveCheckStatusCode } from './types'
import type {
  AiResultImprovementPriorityCode} from '@/types/enums/ai-result-improvement-priority-enum';
import type {
  AiResultIssueSeverityCode} from '@/types/enums/ai-result-issue-severity-enum';
/**
 * AI 结果 API - 对齐 AiResultController。
 *
 * 后端路径：/api/quality/ai-results
 */
import http from '@/config/axios'
import {
  AiResultImprovementPriorityDescription,
} from '@/types/enums/ai-result-improvement-priority-enum'
import {
  AiResultIssueSeverityDescription,
} from '@/types/enums/ai-result-issue-severity-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const BASE = '/api/quality/ai-results'

export {
  AiResultImprovementPriorityCode,
  AiResultImprovementPriorityDescription,
  ALL_AI_RESULT_IMPROVEMENT_PRIORITY_CODES,
} from '@/types/enums/ai-result-improvement-priority-enum'

export {
  AiResultIssueSeverityCode,
  AiResultIssueSeverityDescription,
  ALL_AI_RESULT_ISSUE_SEVERITY_CODES,
} from '@/types/enums/ai-result-issue-severity-enum'

export function aiResultIssueSeverityLabel(value: AiResultIssueSeverityCode): string {
  return strictEnumLabel(AiResultIssueSeverityDescription, value, 'AI 结果问题严重级别')
}

export function aiResultImprovementPriorityLabel(value: AiResultImprovementPriorityCode): string {
  return strictEnumLabel(
    AiResultImprovementPriorityDescription,
    value,
    'AI 改进建议优先级',
  )
}

/** AI 结果问题项 - 严格对齐后端 AiResultIssueItem */
export interface AiResultIssueItem {
  issueTitle?: string
  issueDescription?: string
  severity?: AiResultIssueSeverityCode
}

/** AI 结果证据项 - 严格对齐后端 AiResultEvidenceItem */
export interface AiResultEvidenceItem {
  evidenceTitle?: string
  evidenceSource?: string
  evidenceContent?: string
}

/** AI 结果改进项 - 严格对齐后端 AiResultImprovementItem */
export interface AiResultImprovementItem {
  suggestionTitle?: string
  suggestionContent?: string
  priority?: AiResultImprovementPriorityCode
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
  issueItems?: AiResultIssueItem[]
  /** 证据引用 */
  evidenceItems?: AiResultEvidenceItem[]
  /** 改进措施 */
  improvementItems?: AiResultImprovementItem[]
  /** 结构 / 证据 / 敏感综合校验状态 */
  outputValidation: AiOutputValidationCode
  /** 敏感信息校验状态 */
  sensitiveCheckStatus?: AiSensitiveCheckStatusCode
  /** 敏感信息校验明细文本 */
  sensitiveCheckDetail?: string
  /** 调用模型名 */
  modelName?: string
  /** 提示 token 数 */
  promptTokenCount?: number
  /** 完成 token 数 */
  completionTokenCount?: number
  /** 生成时间 */
  generatedTime?: string
  createTime?: string
  updateTime?: string
}

/** AI 结果校验状态更新请求 - 严格对齐后端 AiResultValidationUpdateRequest */
export interface AiResultValidationUpdateRequest {
  id: string
  outputValidation: AiOutputValidationCode
  sensitiveCheckStatus?: AiSensitiveCheckStatusCode
  sensitiveCheckDetail?: string
}

export const aiResultApi = {
  /** 查询 AI 结果详情 */
  detail: (id: string) => http.post<AiResultVO>(`${BASE}/detail`, { id }),
  /** 按 AI 任务查询结果；尚未生成时后端返回 null */
  getByTask: (aiTaskId: string) =>
    http.post<AiResultVO | null>(`${BASE}/get-by-task`, { id: aiTaskId }),
  /** 更新 AI 结果校验状态（接受 / 退回 AI 输出） */
  updateValidation: (data: AiResultValidationUpdateRequest) =>
    http.post<void>(`${BASE}/update-validation`, data),
}
