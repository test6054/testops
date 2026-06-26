import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 客观题判定结果 - 与后端 ObjectiveResult 枚举完全一致 */
export type ObjectiveResultCode = 'CORRECT' | 'WRONG' | 'NEED_REVIEW'

/** 客观题判定结果文案 - 与后端 ObjectiveResult.message 完全一致 */
export const OBJECTIVE_RESULT_LABEL: Record<ObjectiveResultCode, string> = {
  CORRECT: '正确',
  WRONG: '错误',
  NEED_REVIEW: '待复核',
}

export const OBJECTIVE_RESULT_TONE: Record<ObjectiveResultCode, BadgeTone> = {
  CORRECT: 'green',
  WRONG: 'red',
  NEED_REVIEW: 'orange',
}
