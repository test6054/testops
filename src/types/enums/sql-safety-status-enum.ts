/** SQL 安全检测状态 - SqlSafetyStatusEnum */
export enum SqlSafetyStatusCode {
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
}

export const ALL_SQL_SAFETY_STATUS_CODES: readonly SqlSafetyStatusCode[] = [
  SqlSafetyStatusCode.PASSED,
  SqlSafetyStatusCode.REJECTED,
  SqlSafetyStatusCode.ERROR,
]

export const SqlSafetyStatusDescription: Record<SqlSafetyStatusCode, string> = {
  [SqlSafetyStatusCode.PASSED]: '通过',
  [SqlSafetyStatusCode.REJECTED]: '拒绝',
  [SqlSafetyStatusCode.ERROR]: '检测异常',
}
