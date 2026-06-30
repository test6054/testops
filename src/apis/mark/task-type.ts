import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 批改处理任务类型 - 与后端 TaskType 枚举完全一致 */
export type ProcessingTaskTypeCode
  = | 'PAGE_REGISTER'
    | 'SCAN_ORDER_AUDIT'
    | 'PAPER_BINDING'
    | 'RECOGNITION'
    | 'SUBJECTIVE_AI_REVIEW'
    | 'OBJECTIVE_AUTO_REVIEW'
    | 'OBJECTIVE_AI_REVIEW'
    | 'QUESTION_REVIEW_ARBITRATION'
    | 'GRADING'
    | 'EXPORT_GENERATE'
    | 'ARCHIVE_PACKAGING'

/** 处理任务类型文案 - 与后端 TaskType.message 完全一致 */
export const PROCESSING_TASK_TYPE_LABEL: Record<ProcessingTaskTypeCode, string> = {
  PAGE_REGISTER: '页面登记',
  SCAN_ORDER_AUDIT: '顺序审计',
  PAPER_BINDING: '身份绑定',
  RECOGNITION: '题目识别',
  SUBJECTIVE_AI_REVIEW: '主观题建议评分',
  OBJECTIVE_AUTO_REVIEW: '客观题自动判分复核',
  OBJECTIVE_AI_REVIEW: '客观题AI评分复核',
  QUESTION_REVIEW_ARBITRATION: '题目复核仲裁',
  GRADING: '批改',
  EXPORT_GENERATE: '导出生成',
  ARCHIVE_PACKAGING: '考后归档打包',
}

export const PROCESSING_TASK_TYPE_TONE: Record<ProcessingTaskTypeCode, BadgeTone> = {
  PAGE_REGISTER: 'gray',
  SCAN_ORDER_AUDIT: 'orange',
  PAPER_BINDING: 'blue',
  RECOGNITION: 'blue',
  SUBJECTIVE_AI_REVIEW: 'purple',
  OBJECTIVE_AUTO_REVIEW: 'green',
  OBJECTIVE_AI_REVIEW: 'purple',
  QUESTION_REVIEW_ARBITRATION: 'red',
  GRADING: 'blue',
  EXPORT_GENERATE: 'gray',
  ARCHIVE_PACKAGING: 'gray',
}
