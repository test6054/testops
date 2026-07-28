/**
 * 认证驾驶舱标准条款诊断状态 — 对齐后端 AccreditationStandardClauseStatusEnum
 */
export enum AccreditationStandardClauseStatusCode {
  PASSED = 'PASSED',
  BLOCKED = 'BLOCKED',
}

export const ALL_ACCREDITATION_STANDARD_CLAUSE_STATUS_CODES
  = [
    AccreditationStandardClauseStatusCode.PASSED,
    AccreditationStandardClauseStatusCode.BLOCKED,
  ] as const

export const AccreditationStandardClauseStatusDescription: Record<
  AccreditationStandardClauseStatusCode,
  string
> = {
  [AccreditationStandardClauseStatusCode.PASSED]: '已覆盖',
  [AccreditationStandardClauseStatusCode.BLOCKED]: '待完善',
}
