/** 抽检任务状态 */
export enum SpotCheckStatusCode {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  ABNORMAL = 'ABNORMAL',
  HANDLED = 'HANDLED',
}

export const ALL_SPOT_CHECK_STATUS_CODES: readonly SpotCheckStatusCode[] = [
  SpotCheckStatusCode.PENDING,
  SpotCheckStatusCode.IN_PROGRESS,
  SpotCheckStatusCode.PASSED,
  SpotCheckStatusCode.ABNORMAL,
  SpotCheckStatusCode.HANDLED,
]

export const SpotCheckStatusDescription: Record<SpotCheckStatusCode, string> = {
  [SpotCheckStatusCode.PENDING]: '待抽检',
  [SpotCheckStatusCode.IN_PROGRESS]: '抽检中',
  [SpotCheckStatusCode.PASSED]: '通过',
  [SpotCheckStatusCode.ABNORMAL]: '异常',
  [SpotCheckStatusCode.HANDLED]: '已处理',
}

