/** 文档 OCR 任务状态 */
export enum DocumentOcrTaskStatusCode {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_DOCUMENT_OCR_TASK_STATUS_CODES: readonly DocumentOcrTaskStatusCode[] = [
  DocumentOcrTaskStatusCode.PENDING,
  DocumentOcrTaskStatusCode.RUNNING,
  DocumentOcrTaskStatusCode.COMPLETED,
  DocumentOcrTaskStatusCode.FAILED,
]

/** 文档 OCR 任务状态文案，与后端 DocumentOcrTaskStatusCode 保持一一对应 */
export const DocumentOcrTaskStatusDescription: Record<DocumentOcrTaskStatusCode, string> = {
  [DocumentOcrTaskStatusCode.PENDING]: '待识别',
  [DocumentOcrTaskStatusCode.RUNNING]: '识别中',
  [DocumentOcrTaskStatusCode.COMPLETED]: '识别完成',
  [DocumentOcrTaskStatusCode.FAILED]: '识别失败',
}

