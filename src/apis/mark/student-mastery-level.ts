import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 学生知识掌握等级 - 与后端 StudentMasteryLevel 枚举完全一致 */
export type MasteryLevelCode = 'EXCELLENT' | 'GOOD' | 'MEDIUM' | 'WEAK' | 'CRITICAL'

/** 掌握等级文案 - 与后端 StudentMasteryLevel.message 完全一致 */
export const MASTERY_LEVEL_LABEL: Record<MasteryLevelCode, string> = {
  EXCELLENT: '优秀',
  GOOD: '良好',
  MEDIUM: '中等',
  WEAK: '薄弱',
  CRITICAL: '严重薄弱',
}

export const MASTERY_LEVEL_TONE: Record<MasteryLevelCode, BadgeTone> = {
  EXCELLENT: 'green',
  GOOD: 'blue',
  MEDIUM: 'blue',
  WEAK: 'orange',
  CRITICAL: 'red',
}
