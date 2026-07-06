/** 考试扫描页登记状态 */
export enum ExamScannerPageRegistrationStatusCode {
  REGISTERED = 'REGISTERED',
  PENDING = 'PENDING',
  DISCARDED = 'DISCARDED',
  SUPERSEDED = 'SUPERSEDED',
}

export const ALL_EXAM_SCANNER_PAGE_REGISTRATION_STATUS_CODES: readonly ExamScannerPageRegistrationStatusCode[] = [
  ExamScannerPageRegistrationStatusCode.REGISTERED,
  ExamScannerPageRegistrationStatusCode.PENDING,
  ExamScannerPageRegistrationStatusCode.DISCARDED,
  ExamScannerPageRegistrationStatusCode.SUPERSEDED,
]

export const ExamScannerPageRegistrationStatusDescription: Record<ExamScannerPageRegistrationStatusCode, string> = {
  [ExamScannerPageRegistrationStatusCode.REGISTERED]: '已识别',
  [ExamScannerPageRegistrationStatusCode.PENDING]: '等待识别',
  [ExamScannerPageRegistrationStatusCode.DISCARDED]: '已废弃',
  [ExamScannerPageRegistrationStatusCode.SUPERSEDED]: '已替换',
}
