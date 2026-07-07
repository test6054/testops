import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { TaskStatusCode } from '@/types/enums/task-status-enum'

export {
  ALL_TASK_STATUS_CODES,
  TaskStatusCode,
  TaskStatusDescription,
} from '@/types/enums/task-status-enum'

export const TASK_STATUS_TONE: Record<TaskStatusCode, BadgeTone> = {
  [TaskStatusCode.PENDING]: 'orange',
  [TaskStatusCode.PROCESSING]: 'blue',
  [TaskStatusCode.COMPLETED]: 'green',
  [TaskStatusCode.BLOCKED]: 'red',
  [TaskStatusCode.FAILED]: 'red',
}
