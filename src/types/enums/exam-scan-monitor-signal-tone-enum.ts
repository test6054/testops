/** 扫描监控 Signal 色调，与后端 ExamScanMonitorSignalTone 逐值一致 */
export enum ExamScanMonitorSignalToneCode {
  RED = 'red',
  AMBER = 'amber',
  BLUE = 'blue',
  ORANGE = 'orange',
  GREEN = 'green',
  GRAY = 'gray',
}

export const ALL_EXAM_SCAN_MONITOR_SIGNAL_TONE_CODES: readonly ExamScanMonitorSignalToneCode[] = [
  ExamScanMonitorSignalToneCode.RED,
  ExamScanMonitorSignalToneCode.AMBER,
  ExamScanMonitorSignalToneCode.BLUE,
  ExamScanMonitorSignalToneCode.ORANGE,
  ExamScanMonitorSignalToneCode.GREEN,
  ExamScanMonitorSignalToneCode.GRAY,
]

export function isExamScanMonitorSignalToneCode(
  value: string | null | undefined,
): value is ExamScanMonitorSignalToneCode {
  return (
    value != null
    && (ALL_EXAM_SCAN_MONITOR_SIGNAL_TONE_CODES as readonly string[]).includes(value)
  )
}
