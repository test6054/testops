import type { MarkingTaskStreamEventVO } from '@/apis/mark/marking-task-stream'
import {
  MarkingTaskStreamEventTypeDescription,
} from '@/types/enums/marking-task-stream-event-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 解析阅卷任务 SSE wire 消息；不变量：事件类型必须为后端枚举合同值。
 */
export function readMarkingTaskStreamEvent(data: string): MarkingTaskStreamEventVO {
  const event: MarkingTaskStreamEventVO = JSON.parse(data)
  validateMarkingTaskStreamEvent(event)
  return event
}

/**
 * 校验阅卷任务 SSE 事件枚举合同；不变量：事件类型必须由后端枚举定义。
 */
export function validateMarkingTaskStreamEvent(event: MarkingTaskStreamEventVO): void {
  strictEnumLabel(MarkingTaskStreamEventTypeDescription, event.eventType, '阅卷任务SSE事件类型')
}
