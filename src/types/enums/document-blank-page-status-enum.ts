/** 文档页空白页状态 - 与 edu-mark DocumentBlankPageStatus 对齐 */
export enum DocumentBlankPageStatusCode {
  NORMAL = 'NORMAL',
  BLANK = 'BLANK',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export const ALL_DOCUMENT_BLANK_PAGE_STATUS_CODES: readonly DocumentBlankPageStatusCode[] = [
  DocumentBlankPageStatusCode.NORMAL,
  DocumentBlankPageStatusCode.BLANK,
  DocumentBlankPageStatusCode.REVIEW_REQUIRED,
]

export const DocumentBlankPageStatusDescription: Record<DocumentBlankPageStatusCode, string> = {
  [DocumentBlankPageStatusCode.NORMAL]: '正常页',
  [DocumentBlankPageStatusCode.BLANK]: '空白页',
  [DocumentBlankPageStatusCode.REVIEW_REQUIRED]: '需人工复核',
}
