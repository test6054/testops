/** 批改处理任务类型 */
export enum ProcessingTaskTypeCode {
  PAGE_REGISTER = 'PAGE_REGISTER',
  SCAN_ORDER_AUDIT = 'SCAN_ORDER_AUDIT',
  PAPER_BINDING = 'PAPER_BINDING',
  RECOGNITION = 'RECOGNITION',
  SUBJECTIVE_AI_REVIEW = 'SUBJECTIVE_AI_REVIEW',
  OBJECTIVE_AUTO_REVIEW = 'OBJECTIVE_AUTO_REVIEW',
  OBJECTIVE_AI_REVIEW = 'OBJECTIVE_AI_REVIEW',
  QUESTION_REVIEW_ARBITRATION = 'QUESTION_REVIEW_ARBITRATION',
  GRADING = 'GRADING',
  EXPORT_GENERATE = 'EXPORT_GENERATE',
  ARCHIVE_PACKAGING = 'ARCHIVE_PACKAGING',
  DELAYED_FINAL_SCORE_CONFIRM = 'DELAYED_FINAL_SCORE_CONFIRM',
}

export const ALL_PROCESSING_TASK_TYPE_CODES: readonly ProcessingTaskTypeCode[] = [
  ProcessingTaskTypeCode.PAGE_REGISTER,
  ProcessingTaskTypeCode.SCAN_ORDER_AUDIT,
  ProcessingTaskTypeCode.PAPER_BINDING,
  ProcessingTaskTypeCode.RECOGNITION,
  ProcessingTaskTypeCode.SUBJECTIVE_AI_REVIEW,
  ProcessingTaskTypeCode.OBJECTIVE_AUTO_REVIEW,
  ProcessingTaskTypeCode.OBJECTIVE_AI_REVIEW,
  ProcessingTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
  ProcessingTaskTypeCode.GRADING,
  ProcessingTaskTypeCode.EXPORT_GENERATE,
  ProcessingTaskTypeCode.ARCHIVE_PACKAGING,
  ProcessingTaskTypeCode.DELAYED_FINAL_SCORE_CONFIRM,
]

export const ProcessingTaskTypeDescription: Record<ProcessingTaskTypeCode, string> = {
  [ProcessingTaskTypeCode.PAGE_REGISTER]: '页面登记',
  [ProcessingTaskTypeCode.SCAN_ORDER_AUDIT]: '顺序审计',
  [ProcessingTaskTypeCode.PAPER_BINDING]: '身份绑定',
  [ProcessingTaskTypeCode.RECOGNITION]: '题目识别',
  [ProcessingTaskTypeCode.SUBJECTIVE_AI_REVIEW]: '主观题建议评分',
  [ProcessingTaskTypeCode.OBJECTIVE_AUTO_REVIEW]: '客观题自动判分复核',
  [ProcessingTaskTypeCode.OBJECTIVE_AI_REVIEW]: '客观题AI评分复核',
  [ProcessingTaskTypeCode.QUESTION_REVIEW_ARBITRATION]: '题目复核仲裁',
  [ProcessingTaskTypeCode.GRADING]: '批改',
  [ProcessingTaskTypeCode.EXPORT_GENERATE]: '导出生成',
  [ProcessingTaskTypeCode.ARCHIVE_PACKAGING]: '考后归档打包',
  [ProcessingTaskTypeCode.DELAYED_FINAL_SCORE_CONFIRM]: '延迟成绩确认',
}

