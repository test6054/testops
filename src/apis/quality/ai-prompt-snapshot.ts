/**
 * AI 提示词快照 API - 对应 AiPromptSnapshotController
 * 后端路径：/api/quality/ai-prompt-snapshots
 *
 * 设计文档 §8.2：每次 AI 任务执行前登记完整提示词分段（系统段 / 标准段 / 专业实例段 /
 * 计算段 / 样本段 / 审核段 / 输出格式段 / 禁止指令段），只读不可改。
 */
import http from '@/config/axios'

const BASE = '/api/quality/ai-prompt-snapshots'

export interface AiPromptSnapshotVO {
  id: string
  tenantId?: string
  aiTaskId: string
  promptVersion: string
  systemPrompt?: string
  taskPrompt?: string
  standardSection?: string
  profileSection?: string
  calculationSection?: string
  sampleSection?: string
  auditSection?: string
  outputFormatSection?: string
  forbiddenSection?: string
  digest?: string
  createTime?: string
  updateTime?: string
}

export interface AiPromptSnapshotSavePayload {
  aiTaskId: string
  promptVersion: string
  systemPrompt?: string
  taskPrompt?: string
  standardSection?: string
  profileSection?: string
  calculationSection?: string
  sampleSection?: string
  auditSection?: string
  outputFormatSection?: string
  forbiddenSection?: string
  digest?: string
}

export const aiPromptSnapshotApi = {
  detail: (id: string) =>
    http.post<AiPromptSnapshotVO>(`${BASE}/detail`, { id }),
  /** 按 AI 任务取快照 */
  getByTask: (aiTaskId: string) =>
    http.post<AiPromptSnapshotVO | null>(`${BASE}/get-by-task`, { id: aiTaskId }),
  create: (data: AiPromptSnapshotSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
}
