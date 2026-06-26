import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 最终成绩状态 - 与后端 FinalScoreStatus 枚举完全一致 */
export type FinalScoreStatusCode
  = | 'PENDING'
    | 'CALCULATED'
    | 'CONFIRMED'
    | 'CORRECTED'
    | 'PUBLISHED'
    | 'WITHDRAWN'

/** 最终成绩状态文案 - 与后端 FinalScoreStatus.message 完全一致 */
export const FINAL_SCORE_STATUS_LABEL: Record<FinalScoreStatusCode, string> = {
  PENDING: '待计算',
  CALCULATED: '已计算',
  CONFIRMED: '已确认',
  CORRECTED: '已更正',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤回',
}

export const FINAL_SCORE_STATUS_TONE: Record<FinalScoreStatusCode, BadgeTone> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'orange',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

export const FINAL_SCORE_STATUS_OPTIONS: Array<{
  label: string
  value: FinalScoreStatusCode
}> = [
  { value: 'PENDING', label: FINAL_SCORE_STATUS_LABEL.PENDING },
  { value: 'CALCULATED', label: FINAL_SCORE_STATUS_LABEL.CALCULATED },
  { value: 'CONFIRMED', label: FINAL_SCORE_STATUS_LABEL.CONFIRMED },
  { value: 'CORRECTED', label: FINAL_SCORE_STATUS_LABEL.CORRECTED },
  { value: 'PUBLISHED', label: FINAL_SCORE_STATUS_LABEL.PUBLISHED },
  { value: 'WITHDRAWN', label: FINAL_SCORE_STATUS_LABEL.WITHDRAWN },
]

export const FINAL_SCORE_STATUS_CODES: FinalScoreStatusCode[] = FINAL_SCORE_STATUS_OPTIONS.map(
  option => option.value,
)
