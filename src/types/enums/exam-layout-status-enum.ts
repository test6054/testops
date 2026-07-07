/** 制卷设计生效状态 */
export enum ExamLayoutStatusCode {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
}

export const ALL_EXAM_LAYOUT_STATUS_CODES: readonly ExamLayoutStatusCode[] = [
  ExamLayoutStatusCode.ACTIVE,
  ExamLayoutStatusCode.DRAFT,
]

export const ExamLayoutStatusDescription: Record<ExamLayoutStatusCode, string> = {
  [ExamLayoutStatusCode.ACTIVE]: '生效',
  [ExamLayoutStatusCode.DRAFT]: '草稿',
}

