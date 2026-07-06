/** 整卷印刷来源 */
export enum ExamPrintSourceModeCode {
  SYSTEM_PRINT = 'SYSTEM_PRINT',
  EXTERNAL_PRINT = 'EXTERNAL_PRINT',
}

export const ALL_EXAM_PRINT_SOURCE_MODE_CODES: readonly ExamPrintSourceModeCode[] = [
  ExamPrintSourceModeCode.SYSTEM_PRINT,
  ExamPrintSourceModeCode.EXTERNAL_PRINT,
]

export const ExamPrintSourceModeDescription: Record<ExamPrintSourceModeCode, string> = {
  [ExamPrintSourceModeCode.SYSTEM_PRINT]: '系统制卷',
  [ExamPrintSourceModeCode.EXTERNAL_PRINT]: '外带已印试卷',
}
