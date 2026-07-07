/** 试卷页面类型编码 - 与后端 ExamPaperPageKind.code 完全一致 */
export type ExamPaperPageKindCode
  = 'EXAM_PAPER'
    | 'ANSWER_SHEET'
    | 'HYBRID'

/** 试卷页面类型文案 - 与后端 ExamPaperPageKind.message 完全一致 */
export const EXAM_PAPER_PAGE_KIND_LABEL: Record<ExamPaperPageKindCode, string> = {
  EXAM_PAPER: '试卷页',
  ANSWER_SHEET: '答题卡页',
  HYBRID: '混合页',
}
