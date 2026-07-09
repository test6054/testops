/** 诊断样本来源类型，与后端 DiagnosticSourceType 逐值一致 */
export enum DiagnosticSourceTypeCode {
  SCANNED_PAGE = 'SCANNED_PAGE',
  RESPONSE_SLICE = 'RESPONSE_SLICE',
  GRADE_RESULT = 'GRADE_RESULT',
  RECOGNITION_RESULT = 'RECOGNITION_RESULT',
}

export const ALL_DIAGNOSTIC_SOURCE_TYPE_CODES: readonly DiagnosticSourceTypeCode[] = [
  DiagnosticSourceTypeCode.SCANNED_PAGE,
  DiagnosticSourceTypeCode.RESPONSE_SLICE,
  DiagnosticSourceTypeCode.GRADE_RESULT,
  DiagnosticSourceTypeCode.RECOGNITION_RESULT,
]

export const DiagnosticSourceTypeDescription: Record<DiagnosticSourceTypeCode, string> = {
  [DiagnosticSourceTypeCode.SCANNED_PAGE]: '扫描页',
  [DiagnosticSourceTypeCode.RESPONSE_SLICE]: '作答切片',
  [DiagnosticSourceTypeCode.GRADE_RESULT]: '批改结果',
  [DiagnosticSourceTypeCode.RECOGNITION_RESULT]: '识别结果',
}

