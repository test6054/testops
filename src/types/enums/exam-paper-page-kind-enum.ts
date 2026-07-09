/** 试卷页面类型，与后端 ExamPaperPageKind 逐值一致 */
export enum ExamPaperPageKindCode {
  EXAM_PAPER = 'EXAM_PAPER',
  ANSWER_SHEET = 'ANSWER_SHEET',
  HYBRID = 'HYBRID',
}

export const ALL_EXAM_PAPER_PAGE_KIND_CODES: readonly ExamPaperPageKindCode[] = [
  ExamPaperPageKindCode.EXAM_PAPER,
  ExamPaperPageKindCode.ANSWER_SHEET,
  ExamPaperPageKindCode.HYBRID,
]

export const ExamPaperPageKindDescription: Record<ExamPaperPageKindCode, string> = {
  [ExamPaperPageKindCode.EXAM_PAPER]: '试卷页',
  [ExamPaperPageKindCode.ANSWER_SHEET]: '答题卡页',
  [ExamPaperPageKindCode.HYBRID]: '混合页',
}

