/** 文档 OCR 页结果状态 */
export enum DocumentOcrPageResultStatusCode {
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

export const ALL_DOCUMENT_OCR_PAGE_RESULT_STATUS_CODES: readonly DocumentOcrPageResultStatusCode[] = [
  DocumentOcrPageResultStatusCode.COMPLETED,
  DocumentOcrPageResultStatusCode.SKIPPED,
  DocumentOcrPageResultStatusCode.FAILED,
]

export const DocumentOcrPageResultStatusDescription: Record<DocumentOcrPageResultStatusCode, string> = {
  [DocumentOcrPageResultStatusCode.COMPLETED]: '已完成',
  [DocumentOcrPageResultStatusCode.SKIPPED]: '已跳过',
  [DocumentOcrPageResultStatusCode.FAILED]: '失败',
}

