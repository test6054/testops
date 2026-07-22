/** 认证周期状态 - AccreditationCycleStatusEnum */
export enum AccreditationCycleStatusCode {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED',
}

export const ALL_ACCREDITATION_CYCLE_STATUS_CODES: readonly AccreditationCycleStatusCode[] = [
  AccreditationCycleStatusCode.ACTIVE,
  AccreditationCycleStatusCode.CLOSED,
  AccreditationCycleStatusCode.SUSPENDED,
]

export const AccreditationCycleStatusDescription: Record<AccreditationCycleStatusCode, string> = {
  [AccreditationCycleStatusCode.ACTIVE]: '进行中',
  [AccreditationCycleStatusCode.CLOSED]: '已关闭',
  [AccreditationCycleStatusCode.SUSPENDED]: '暂停',
}

