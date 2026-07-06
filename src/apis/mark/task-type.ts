import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ALL_PROCESSING_TASK_TYPE_CODES,
  ProcessingTaskTypeCode,
  ProcessingTaskTypeDescription,
} from '@/types/enums/processing-task-type-enum'

export {
  ALL_PROCESSING_TASK_TYPE_CODES,
  ProcessingTaskTypeCode,
  ProcessingTaskTypeDescription,
} from '@/types/enums/processing-task-type-enum'

export const PROCESSING_TASK_TYPE_TONE: Record<ProcessingTaskTypeCode, BadgeTone> = {
  [ProcessingTaskTypeCode.PAGE_REGISTER]: 'gray',
  [ProcessingTaskTypeCode.SCAN_ORDER_AUDIT]: 'orange',
  [ProcessingTaskTypeCode.PAPER_BINDING]: 'blue',
  [ProcessingTaskTypeCode.RECOGNITION]: 'blue',
  [ProcessingTaskTypeCode.SUBJECTIVE_AI_REVIEW]: 'purple',
  [ProcessingTaskTypeCode.OBJECTIVE_AUTO_REVIEW]: 'green',
  [ProcessingTaskTypeCode.OBJECTIVE_AI_REVIEW]: 'purple',
  [ProcessingTaskTypeCode.QUESTION_REVIEW_ARBITRATION]: 'red',
  [ProcessingTaskTypeCode.GRADING]: 'blue',
  [ProcessingTaskTypeCode.EXPORT_GENERATE]: 'gray',
  [ProcessingTaskTypeCode.ARCHIVE_PACKAGING]: 'gray',
  [ProcessingTaskTypeCode.DELAYED_FINAL_SCORE_CONFIRM]: 'orange',
}

export const PROCESSING_TASK_TYPE_OPTIONS: Array<{ value: ProcessingTaskTypeCode, label: string }>
  = ALL_PROCESSING_TASK_TYPE_CODES.map((value) => ({
    value,
    label: ProcessingTaskTypeDescription[value],
  }))
