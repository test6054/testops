/** MarkOcrProviderType */
export enum MarkOcrProviderTypeCode {
  BAIDU = 'BAIDU',
  PADDLE = 'PADDLE',
}

export const ALL_MARK_OCR_PROVIDER_TYPE_CODES: readonly MarkOcrProviderTypeCode[] = [
  MarkOcrProviderTypeCode.BAIDU,
  MarkOcrProviderTypeCode.PADDLE,
]

export const MarkOcrProviderTypeDescription: Record<MarkOcrProviderTypeCode, string> = {
  [MarkOcrProviderTypeCode.BAIDU]: '百度 OCR',
  [MarkOcrProviderTypeCode.PADDLE]: 'PaddleOCR 本地服务',
}

