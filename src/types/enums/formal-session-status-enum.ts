/** 正评会话状态 */
export enum FormalSessionStatusCode {
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_ACTIVE = 'SESSION_ACTIVE',
  SESSION_PAUSED = 'SESSION_PAUSED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_CLOSED = 'SESSION_CLOSED',
}

export const ALL_FORMAL_SESSION_STATUS_CODES: readonly FormalSessionStatusCode[] = [
  FormalSessionStatusCode.SESSION_CREATED,
  FormalSessionStatusCode.SESSION_ACTIVE,
  FormalSessionStatusCode.SESSION_PAUSED,
  FormalSessionStatusCode.SESSION_COMPLETED,
  FormalSessionStatusCode.SESSION_CLOSED,
]
export const FormalSessionStatusDescription: Record<FormalSessionStatusCode, string> = {
  [FormalSessionStatusCode.SESSION_CREATED]: '已创建',
  [FormalSessionStatusCode.SESSION_ACTIVE]: '进行中',
  [FormalSessionStatusCode.SESSION_PAUSED]: '已暂停',
  [FormalSessionStatusCode.SESSION_COMPLETED]: '已完成',
  [FormalSessionStatusCode.SESSION_CLOSED]: '已关闭',
}
