/** 制卷入口类型编码 - 与后端 ExamLayoutEntryKind.code 完全一致 */
export type ExamLayoutEntryKindCode
  = 'BLANK_SHEET'
    | 'SOURCE_FILE'

/** 制卷入口类型文案 */
export const EXAM_LAYOUT_ENTRY_KIND_LABEL: Record<ExamLayoutEntryKindCode, string> = {
  BLANK_SHEET: '无源答题卡',
  SOURCE_FILE: '整卷有源',
}
