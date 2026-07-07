/** 考试状态（批改链保留 ACTIVE / CLOSED） */
export enum ExamStatusCode {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export const ALL_EXAM_STATUS_CODES: readonly ExamStatusCode[] = [
  ExamStatusCode.ACTIVE,
  ExamStatusCode.CLOSED,
]

export const ExamStatusDescription: Record<ExamStatusCode, string> = {
  [ExamStatusCode.ACTIVE]: '正常',
  [ExamStatusCode.CLOSED]: '已关闭',
}
