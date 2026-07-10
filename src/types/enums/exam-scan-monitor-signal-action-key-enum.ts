/** 扫描监控 SignalBand 操作建议键，与后端 signalActionKey 逐值一致 */
export enum ExamScanMonitorSignalActionKeyCode {
  UPLOAD_ROSTER = 'UPLOAD_ROSTER',
  VIEW_ATTENTION = 'VIEW_ATTENTION',
  PUBLISH_SCORE = 'PUBLISH_SCORE',
  REFRESH = 'REFRESH',
}

export const ALL_EXAM_SCAN_MONITOR_SIGNAL_ACTION_KEY_CODES: readonly ExamScanMonitorSignalActionKeyCode[] = [
  ExamScanMonitorSignalActionKeyCode.UPLOAD_ROSTER,
  ExamScanMonitorSignalActionKeyCode.VIEW_ATTENTION,
  ExamScanMonitorSignalActionKeyCode.PUBLISH_SCORE,
  ExamScanMonitorSignalActionKeyCode.REFRESH,
]

export function isExamScanMonitorSignalActionKeyCode(
  value: string | null | undefined,
): value is ExamScanMonitorSignalActionKeyCode {
  return (
    value != null
    && (ALL_EXAM_SCAN_MONITOR_SIGNAL_ACTION_KEY_CODES as readonly string[]).includes(value)
  )
}
