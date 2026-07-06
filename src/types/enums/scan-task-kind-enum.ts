/** 扫描任务种类 */
export enum ScanTaskKindCode {
  EXAM_MARKING = 'EXAM_MARKING',
  EXAM_ARCHIVE = 'EXAM_ARCHIVE',
  PORTFOLIO_COLLECT = 'PORTFOLIO_COLLECT',
}

export const ALL_SCAN_TASK_KIND_CODES: readonly ScanTaskKindCode[] = [
  ScanTaskKindCode.EXAM_MARKING,
  ScanTaskKindCode.EXAM_ARCHIVE,
  ScanTaskKindCode.PORTFOLIO_COLLECT,
]
export const ScanTaskKindDescription: Record<ScanTaskKindCode, string> = {
  [ScanTaskKindCode.EXAM_MARKING]: '考试阅卷',
  [ScanTaskKindCode.EXAM_ARCHIVE]: '考试归档',
  [ScanTaskKindCode.PORTFOLIO_COLLECT]: '档案袋采集',
}

/** 文档采集一体机队列页任务种类文案 */
export const KioskDispatchScanTaskKindDescription: Record<ScanTaskKindCode, string> = {
  [ScanTaskKindCode.EXAM_MARKING]: '考试阅卷',
  [ScanTaskKindCode.EXAM_ARCHIVE]: '考后归档',
  [ScanTaskKindCode.PORTFOLIO_COLLECT]: '教师档案袋',
}

export const ALL_KIOSK_DISPATCH_SCAN_TASK_KIND_CODES: readonly ScanTaskKindCode[] = [
  ScanTaskKindCode.EXAM_ARCHIVE,
  ScanTaskKindCode.PORTFOLIO_COLLECT,
]

