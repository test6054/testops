/** 制卷入口类型，与后端 ExamLayoutEntryKind 逐值一致 */
export enum ExamLayoutEntryKindCode {
  SOURCE_FILE = 'SOURCE_FILE',
  BLANK_SHEET = 'BLANK_SHEET',
}

export const ALL_EXAM_LAYOUT_ENTRY_KIND_CODES: readonly ExamLayoutEntryKindCode[] = [
  ExamLayoutEntryKindCode.SOURCE_FILE,
  ExamLayoutEntryKindCode.BLANK_SHEET,
]

export const ExamLayoutEntryKindDescription: Record<ExamLayoutEntryKindCode, string> = {
  [ExamLayoutEntryKindCode.SOURCE_FILE]: '有源整卷',
  [ExamLayoutEntryKindCode.BLANK_SHEET]: '标准答题页',
}

