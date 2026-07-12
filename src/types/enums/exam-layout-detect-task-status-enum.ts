/**
 * 制卷自动预划区异步任务状态；须与 edu-mark ExamLayoutDetectTaskStatus 逐值一致。
 */
export enum ExamLayoutDetectTaskStatusCode {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_EXAM_LAYOUT_DETECT_TASK_STATUS_CODES: readonly ExamLayoutDetectTaskStatusCode[] = [
  ExamLayoutDetectTaskStatusCode.QUEUED,
  ExamLayoutDetectTaskStatusCode.RUNNING,
  ExamLayoutDetectTaskStatusCode.SUCCEEDED,
  ExamLayoutDetectTaskStatusCode.FAILED,
  ExamLayoutDetectTaskStatusCode.CANCELLED,
]

export const ExamLayoutDetectTaskStatusDescription: Record<ExamLayoutDetectTaskStatusCode, string> = {
  [ExamLayoutDetectTaskStatusCode.QUEUED]: '排队中',
  [ExamLayoutDetectTaskStatusCode.RUNNING]: '识别中',
  [ExamLayoutDetectTaskStatusCode.SUCCEEDED]: '已完成',
  [ExamLayoutDetectTaskStatusCode.FAILED]: '失败',
  [ExamLayoutDetectTaskStatusCode.CANCELLED]: '已取消',
}

export function requireExamLayoutDetectTaskStatusCode(value: unknown): ExamLayoutDetectTaskStatusCode {
  if (typeof value !== 'string') {
    throw new TypeError('制卷识别任务状态契约异常')
  }
  const code = ALL_EXAM_LAYOUT_DETECT_TASK_STATUS_CODES.find((item) => item === value)
  if (!code) {
    throw new Error('制卷识别任务状态契约异常')
  }
  return code
}

export function isExamLayoutDetectInFlightStatus(status: ExamLayoutDetectTaskStatusCode): boolean {
  return status === ExamLayoutDetectTaskStatusCode.QUEUED
    || status === ExamLayoutDetectTaskStatusCode.RUNNING
}
