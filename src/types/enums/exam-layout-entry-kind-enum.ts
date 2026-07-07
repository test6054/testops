/**
 * 制卷入口类型
 */
export enum ExamLayoutEntryKindCode {
  SOURCE_FILE = 'SOURCE_FILE',
  BLANK_SHEET = 'BLANK_SHEET',
}

export const ExamLayoutEntryKindDescription: Record<ExamLayoutEntryKindCode, string> = {
  [ExamLayoutEntryKindCode.SOURCE_FILE]: '有源整卷',
  [ExamLayoutEntryKindCode.BLANK_SHEET]: '标准答题卡',
}
