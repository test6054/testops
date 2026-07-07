/** PassbackStatus */
export enum PassbackStatusCode {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  WITHDRAWN = 'WITHDRAWN',
}

export const ALL_PASSBACK_STATUS_CODES: readonly PassbackStatusCode[] = [
  PassbackStatusCode.PENDING,
  PassbackStatusCode.SENT,
  PassbackStatusCode.SUCCESS,
  PassbackStatusCode.FAILED,
  PassbackStatusCode.WITHDRAWN,
]

export const PassbackStatusDescription: Record<PassbackStatusCode, string> = {
  [PassbackStatusCode.PENDING]: '待发送',
  [PassbackStatusCode.SENT]: '已发送',
  [PassbackStatusCode.SUCCESS]: '回写成功',
  [PassbackStatusCode.FAILED]: '回写失败',
  [PassbackStatusCode.WITHDRAWN]: '已撤回',
}
