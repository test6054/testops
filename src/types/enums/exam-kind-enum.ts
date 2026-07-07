/** 考试性质 */
export enum ExamKindCode {
  REGULAR = 'REGULAR',
  MAKEUP = 'MAKEUP',
  RETAKE = 'RETAKE',
  REEXAM = 'REEXAM',
  DEFERRED = 'DEFERRED',
}

export const ALL_EXAM_KIND_CODES: readonly ExamKindCode[] = [
  ExamKindCode.REGULAR,
  ExamKindCode.MAKEUP,
  ExamKindCode.RETAKE,
  ExamKindCode.REEXAM,
  ExamKindCode.DEFERRED,
]

export const ExamKindDescription: Record<ExamKindCode, string> = {
  [ExamKindCode.REGULAR]: '正考',
  [ExamKindCode.MAKEUP]: '补考',
  [ExamKindCode.RETAKE]: '重修',
  [ExamKindCode.REEXAM]: '重考',
  [ExamKindCode.DEFERRED]: '缓考',
}

