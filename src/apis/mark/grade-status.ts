import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 题目批改状态 - 与后端 GradeStatus 枚举完全一致 */
export type GradeStatusCode = 'PENDING' | 'NEED_REVIEW' | 'CONFIRMED'

/** 题目批改状态文案 - 与后端 GradeStatus.message 完全一致 */
export const GRADE_STATUS_LABEL: Record<GradeStatusCode, string> = {
  PENDING: '待批改',
  NEED_REVIEW: '待复核',
  CONFIRMED: '已确认',
}

export const GRADE_STATUS_TONE: Record<GradeStatusCode, BadgeTone> = {
  PENDING: 'gray',
  NEED_REVIEW: 'orange',
  CONFIRMED: 'green',
}
