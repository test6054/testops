import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  AiAnalysisStatusCode,
  AiAnalysisStatusDescription,
} from '@/types/enums/ai-analysis-status-enum'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

export {
  AiAnalysisStatusCode,
  AiAnalysisStatusDescription,
  ALL_AI_ANALYSIS_STATUS_CODES,
} from '@/types/enums/ai-analysis-status-enum'

/** AI 分析状态徽标颜色 */
export const AI_ANALYSIS_STATUS_TONE: Record<AiAnalysisStatusCode, BadgeTone> = {
  [AiAnalysisStatusCode.PENDING]: 'orange',
  [AiAnalysisStatusCode.SUCCESS]: 'green',
  [AiAnalysisStatusCode.FAILED]: 'red',
  [AiAnalysisStatusCode.BLOCKED]: 'red',
}

export function aiAnalysisStatusLabel(status: AiAnalysisStatusCode): string {
  return strictEnumLabel(AiAnalysisStatusDescription, status, 'AI 分析状态')
}

export function aiAnalysisStatusColor(status: AiAnalysisStatusCode): BadgeTone {
  return strictEnumTone(AI_ANALYSIS_STATUS_TONE, status, 'AI 分析状态')
}

/** AI 分析主流程状态链（不含失败分支），供列表页流程 hint 展示 */
export const AI_ANALYSIS_MAIN_FLOW_STATUSES: AiAnalysisStatusCode[] = [
  AiAnalysisStatusCode.PENDING,
  AiAnalysisStatusCode.SUCCESS,
]

/** AI 分析分支终态 hint 文案 */
export const AI_ANALYSIS_BRANCH_STATUS_DESCRIPTIONS: string[] = [
  AiAnalysisStatusDescription[AiAnalysisStatusCode.FAILED],
  AiAnalysisStatusDescription[AiAnalysisStatusCode.BLOCKED],
]

/** AI 分析主流程 hint */
export const AI_ANALYSIS_FLOW_HINT = `${AI_ANALYSIS_MAIN_FLOW_STATUSES.map(
  (status) => AiAnalysisStatusDescription[status],
).join(' → ')} / ${AI_ANALYSIS_BRANCH_STATUS_DESCRIPTIONS.join(' / ')}`
