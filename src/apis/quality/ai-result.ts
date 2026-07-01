import type { AiOutputValidation } from './types'
/**
 * AI 结果 API - 对齐 AiResultController。
 *
 * 后端路径：/api/quality/ai-results
 */
import http from '@/config/axios'
import { strictEnumLabel } from '@/utils/strict-enum'

const BASE = '/api/quality/ai-results'

/** AI 结果问题严重级别 - 对齐 AiResultIssueSeverityEnum */
export type AiResultIssueSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export const AI_RESULT_ISSUE_SEVERITY_LABEL: Record<AiResultIssueSeverity, string> = {
  HIGH: '高影响',
  MEDIUM: '中影响',
  LOW: '低影响',
  INFO: '提示',
}

/** AI 改进建议跟进优先级 - 对齐 AiResultImprovementPriorityEnum */
export type AiResultImprovementPriority = 'URGENT' | 'HIGH' | 'VERIFICATION' | 'OBSERVE'

export const AI_RESULT_IMPROVEMENT_PRIORITY_LABEL: Record<AiResultImprovementPriority, string> = {
  URGENT: '紧急',
  HIGH: '高优先级',
  VERIFICATION: '验证',
  OBSERVE: '观察',
}

/** 达成度诊断改进类别 - 对齐 AiResultImprovementCategoryEnum */
export type AiResultImprovementCategory =
  'TEACHING' | 'ASSESSMENT' | 'STUDENT_SUPPORT' | 'FACULTY_PREPARATION' | 'RESOURCE'

export const AI_RESULT_IMPROVEMENT_CATEGORY_LABEL: Record<AiResultImprovementCategory, string> = {
  TEACHING: '教学',
  ASSESSMENT: '考核',
  STUDENT_SUPPORT: '学生支持',
  FACULTY_PREPARATION: '师资',
  RESOURCE: '资源',
}

/** improvementItems.priority 持久化混用跟进优先级与达成度类别 */
export type AiResultImprovementPriorityValue =
  AiResultImprovementPriority | AiResultImprovementCategory

export function aiResultIssueSeverityLabel(value: AiResultIssueSeverity): string {
  return strictEnumLabel(AI_RESULT_ISSUE_SEVERITY_LABEL, value, 'AI 结果问题严重级别')
}

export function aiResultImprovementPriorityLabel(value: AiResultImprovementPriorityValue): string {
  if (value in AI_RESULT_IMPROVEMENT_PRIORITY_LABEL) {
    return strictEnumLabel(
      AI_RESULT_IMPROVEMENT_PRIORITY_LABEL,
      value as AiResultImprovementPriority,
      'AI 改进跟进优先级',
    )
  }
  return strictEnumLabel(
    AI_RESULT_IMPROVEMENT_CATEGORY_LABEL,
    value as AiResultImprovementCategory,
    'AI 改进类别',
  )
}

/** AI 结果问题项 - 严格对齐后端 AiResultIssueItem */
export interface AiResultIssueItem {
  issueTitle: string
  issueDescription?: string
  severity?: AiResultIssueSeverity
}

/** AI 结果证据项 - 严格对齐后端 AiResultEvidenceItem */
export interface AiResultEvidenceItem {
  evidenceTitle: string
  evidenceSource?: string
  evidenceContent: string
}

/** AI 结果改进项 - 严格对齐后端 AiResultImprovementItem */
export interface AiResultImprovementItem {
  suggestionTitle: string
  suggestionContent: string
  priority?: AiResultImprovementPriorityValue
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
  generatedTime?: string
  createTime?: string
  updateTime?: string
}

/** AI 结果保存请求 - 严格对齐后端 AiResultSaveRequest */
export interface AiResultSaveRequest {
  aiTaskId: string
  resultTitle: string
  summary?: string
  issueItems?: AiResultIssueItem[]
  evidenceItems?: AiResultEvidenceItem[]
  improvementItems?: AiResultImprovementItem[]
  outputValidation: AiOutputValidation
  sensitiveCheckStatus?: string
  sensitiveCheckDetail?: string
  modelName: string
  promptTokenCount?: number
  completionTokenCount?: number
  generatedTime?: string
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
