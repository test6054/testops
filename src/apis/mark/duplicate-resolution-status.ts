import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 重复影像处置状态 - 与后端 DuplicateResolutionStatus 枚举完全一致 */
export type DuplicateResolutionStatusCode = 'PENDING' | 'RESOLVED'

/** 重复处置状态文案 - 与后端 DuplicateResolutionStatus.message 完全一致 */
export const DUPLICATE_RESOLUTION_STATUS_LABEL: Record<DuplicateResolutionStatusCode, string> = {
  PENDING: '待处置',
  RESOLVED: '已处置',
}

export const DUPLICATE_RESOLUTION_STATUS_TONE: Record<DuplicateResolutionStatusCode, BadgeTone> = {
  PENDING: 'orange',
  RESOLVED: 'green',
}
