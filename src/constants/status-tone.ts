import type { BadgeTone } from '@/components/ui-guide/ui/types'

/**
 * 全局状态 tone 语义（与 frontend-design-mark Semantic Color Roles 对齐）。
 */
export const STATUS_TONE = {
  /** 待开始 / 未激活 */
  pending: 'gray',
  /** 进行中 / 活跃 */
  active: 'blue',
  /** 待完善 / 需关注 */
  caution: 'orange',
  /** 已完成 / 已通过 */
  success: 'green',
  /** 异常 / 阻塞 */
  error: 'red',
  /** AI 辅助 */
  ai: 'purple',
} as const satisfies Record<string, BadgeTone>

export type StatusToneKey = keyof typeof STATUS_TONE
