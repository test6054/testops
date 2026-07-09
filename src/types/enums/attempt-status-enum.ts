/** 学生考试作答状态，与后端 AttemptStatus 逐值一致 */
export enum AttemptStatusCode {
  NORMAL = 'NORMAL',
  MAKEUP = 'MAKEUP',
  RETAKE = 'RETAKE',
  ABSENT = 'ABSENT',
}

export const ALL_ATTEMPT_STATUS_CODES: readonly AttemptStatusCode[] = [
  AttemptStatusCode.NORMAL,
  AttemptStatusCode.MAKEUP,
  AttemptStatusCode.RETAKE,
  AttemptStatusCode.ABSENT,
]

/** 扫描绑定可选作答状态（缺考由缺考主链处理，不参与手动绑定） */
export const BINDABLE_ATTEMPT_STATUS_CODES: readonly AttemptStatusCode[] = [
  AttemptStatusCode.NORMAL,
  AttemptStatusCode.MAKEUP,
  AttemptStatusCode.RETAKE,
]

export const AttemptStatusDescription: Record<AttemptStatusCode, string> = {
  [AttemptStatusCode.NORMAL]: '正常',
  [AttemptStatusCode.MAKEUP]: '补考',
  [AttemptStatusCode.RETAKE]: '重考',
  [AttemptStatusCode.ABSENT]: '缺考',
}
