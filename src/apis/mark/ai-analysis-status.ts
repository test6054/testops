import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

/** AI 分析状态 - 与后端 AiAnalysisStatus 枚举完全一致 */
export type AiAnalysisStatusCode = 'PENDING' | 'SUCCESS' | 'FAILED' | 'BLOCKED'

/** AI 分析状态文案 - 与后端 AiAnalysisStatus.message 完全一致 */
export const AI_ANALYSIS_STATUS_LABEL: Record<AiAnalysisStatusCode, string> = {
  PENDING: '待分析',
  SUCCESS: '分析成功',
  FAILED: '分析失败',
  BLOCKED: '分析阻塞',
}

/** AI 分析状态徽标颜色 */
export const AI_ANALYSIS_STATUS_TONE: Record<AiAnalysisStatusCode, BadgeTone> = {
  PENDING: 'orange',
  SUCCESS: 'green',
  FAILED: 'red',
  BLOCKED: 'red',
}

export function aiAnalysisStatusLabel(status: AiAnalysisStatusCode): string {
  return strictEnumLabel(AI_ANALYSIS_STATUS_LABEL, status, 'AI 分析状态')
}

export function aiAnalysisStatusColor(status: AiAnalysisStatusCode): BadgeTone {
  return strictEnumTone(AI_ANALYSIS_STATUS_TONE, status, 'AI 分析状态')
}
