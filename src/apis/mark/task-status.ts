import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 批改处理任务状态 - 与后端 TaskStatus 枚举完全一致 */
export type TaskStatusCode = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'BLOCKED' | 'FAILED'

/** 处理任务状态文案 - 与后端 TaskStatus.message 完全一致 */
export const TASK_STATUS_LABEL: Record<TaskStatusCode, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
  BLOCKED: '已阻断',
  FAILED: '失败',
}

export const TASK_STATUS_TONE: Record<TaskStatusCode, BadgeTone> = {
  PENDING: 'orange',
  PROCESSING: 'blue',
  COMPLETED: 'green',
  BLOCKED: 'red',
  FAILED: 'red',
}
