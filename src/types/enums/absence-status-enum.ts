/** 缺考记录状态 */
export enum AbsenceStatusCode {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REVOKED = 'REVOKED',
  MAKEUP_ARRANGED = 'MAKEUP_ARRANGED',
  MAKEUP_COMPLETED = 'MAKEUP_COMPLETED',
}

export const ALL_ABSENCE_STATUS_CODES: readonly AbsenceStatusCode[] = [
  AbsenceStatusCode.PENDING,
  AbsenceStatusCode.CONFIRMED,
  AbsenceStatusCode.REVOKED,
  AbsenceStatusCode.MAKEUP_ARRANGED,
  AbsenceStatusCode.MAKEUP_COMPLETED,
]

export const AbsenceStatusDescription: Record<AbsenceStatusCode, string> = {
  [AbsenceStatusCode.PENDING]: '待确认',
  [AbsenceStatusCode.CONFIRMED]: '已确认',
  [AbsenceStatusCode.REVOKED]: '已撤销',
  [AbsenceStatusCode.MAKEUP_ARRANGED]: '已安排补考',
  [AbsenceStatusCode.MAKEUP_COMPLETED]: '已完成补考',
}
