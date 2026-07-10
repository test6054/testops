/** 扫描监控看板 SignalBand 状态码，与后端 ExamScanMonitorSignalCode 逐值一致 */
export enum ExamScanMonitorSignalCode {
  EMPTY = 'EMPTY',
  MISSING_ROSTER = 'MISSING_ROSTER',
  AWAITING_FIRST_SCAN_INFERENCE = 'AWAITING_FIRST_SCAN_INFERENCE',
  PAGE_REGISTER_PENDING = 'PAGE_REGISTER_PENDING',
  SCAN_IN_PROGRESS = 'SCAN_IN_PROGRESS',
  PARTIAL_TAIL = 'PARTIAL_TAIL',
  INCIDENT_OPEN = 'INCIDENT_OPEN',
  BALANCED = 'BALANCED',
}

export const ALL_EXAM_SCAN_MONITOR_SIGNAL_CODES: readonly ExamScanMonitorSignalCode[] = [
  ExamScanMonitorSignalCode.EMPTY,
  ExamScanMonitorSignalCode.MISSING_ROSTER,
  ExamScanMonitorSignalCode.AWAITING_FIRST_SCAN_INFERENCE,
  ExamScanMonitorSignalCode.PAGE_REGISTER_PENDING,
  ExamScanMonitorSignalCode.SCAN_IN_PROGRESS,
  ExamScanMonitorSignalCode.PARTIAL_TAIL,
  ExamScanMonitorSignalCode.INCIDENT_OPEN,
  ExamScanMonitorSignalCode.BALANCED,
]

export function isExamScanMonitorSignalCode(
  value: string | null | undefined,
): value is ExamScanMonitorSignalCode {
  return (
    value != null
    && (ALL_EXAM_SCAN_MONITOR_SIGNAL_CODES as readonly string[]).includes(value)
  )
}
