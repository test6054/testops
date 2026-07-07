/** 缺考原因 */
export enum AbsenceReasonCode {
  ABSENT = 'ABSENT',
  LEAVE = 'LEAVE',
  WITHDRAW = 'WITHDRAW',
  PAPER_LOST = 'PAPER_LOST',
  OTHER = 'OTHER',
}

export const ALL_ABSENCE_REASON_CODES: readonly AbsenceReasonCode[] = [
  AbsenceReasonCode.ABSENT,
  AbsenceReasonCode.LEAVE,
  AbsenceReasonCode.WITHDRAW,
  AbsenceReasonCode.PAPER_LOST,
  AbsenceReasonCode.OTHER,
]

export const AbsenceReasonDescription: Record<AbsenceReasonCode, string> = {
  [AbsenceReasonCode.ABSENT]: '缺考',
  [AbsenceReasonCode.LEAVE]: '请假',
  [AbsenceReasonCode.WITHDRAW]: '退课',
  [AbsenceReasonCode.PAPER_LOST]: '试卷丢失',
  [AbsenceReasonCode.OTHER]: '其他',
}

