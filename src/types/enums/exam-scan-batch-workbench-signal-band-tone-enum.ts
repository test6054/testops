/** 扫描批次工作台 Signal 色调，与后端 ExamScanBatchWorkbenchSignalBandTone 逐值一致 */
export enum ExamScanBatchWorkbenchSignalBandToneCode {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export const ALL_EXAM_SCAN_BATCH_WORKBENCH_SIGNAL_BAND_TONE_CODES: readonly ExamScanBatchWorkbenchSignalBandToneCode[] = [
  ExamScanBatchWorkbenchSignalBandToneCode.ERROR,
  ExamScanBatchWorkbenchSignalBandToneCode.WARNING,
  ExamScanBatchWorkbenchSignalBandToneCode.INFO,
]

export function isExamScanBatchWorkbenchSignalBandToneCode(
  value: string | null | undefined,
): value is ExamScanBatchWorkbenchSignalBandToneCode {
  return (
    value != null
    && (ALL_EXAM_SCAN_BATCH_WORKBENCH_SIGNAL_BAND_TONE_CODES as readonly string[]).includes(value)
  )
}
