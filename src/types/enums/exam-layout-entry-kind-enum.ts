/** 制卷入口类型，与后端 ExamLayoutEntryKind 逐值一致 */
export enum ExamLayoutEntryKindCode {
  SOURCE_FILE = 'SOURCE_FILE',
  PAPER_WITH_ANSWER_SHEET = 'PAPER_WITH_ANSWER_SHEET',
}

export const ALL_EXAM_LAYOUT_ENTRY_KIND_CODES: readonly ExamLayoutEntryKindCode[] = [
  ExamLayoutEntryKindCode.SOURCE_FILE,
  ExamLayoutEntryKindCode.PAPER_WITH_ANSWER_SHEET,
]

export const ExamLayoutEntryKindDescription: Record<ExamLayoutEntryKindCode, string> = {
  [ExamLayoutEntryKindCode.SOURCE_FILE]: '单独试卷',
  [ExamLayoutEntryKindCode.PAPER_WITH_ANSWER_SHEET]: '试题卷+答题纸',
}
