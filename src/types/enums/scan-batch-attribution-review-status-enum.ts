/** 扫描批次学生归卷复核状态，与后端 ScanBatchAttributionReviewStatus 逐值一致 */
export enum ScanBatchAttributionReviewStatusCode {
  UNASSIGNED = 'UNASSIGNED',
  PENDING_BIND = 'PENDING_BIND',
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  BOUND_INCOMPLETE = 'BOUND_INCOMPLETE',
  BOUND_COMPLETE = 'BOUND_COMPLETE',
  SUSPECTED_MIXED = 'SUSPECTED_MIXED',
}

export const ALL_SCAN_BATCH_ATTRIBUTION_REVIEW_STATUS_CODES: readonly ScanBatchAttributionReviewStatusCode[] = [
    ScanBatchAttributionReviewStatusCode.UNASSIGNED,
    ScanBatchAttributionReviewStatusCode.PENDING_BIND,
    ScanBatchAttributionReviewStatusCode.PENDING_CONFIRM,
    ScanBatchAttributionReviewStatusCode.BOUND_INCOMPLETE,
    ScanBatchAttributionReviewStatusCode.BOUND_COMPLETE,
    ScanBatchAttributionReviewStatusCode.SUSPECTED_MIXED,
  ]

export const ScanBatchAttributionReviewStatusDescription: Record<ScanBatchAttributionReviewStatusCode, string> = {
    [ScanBatchAttributionReviewStatusCode.UNASSIGNED]: '未归卷',
    [ScanBatchAttributionReviewStatusCode.PENDING_BIND]: '待绑定',
    [ScanBatchAttributionReviewStatusCode.PENDING_CONFIRM]: '待确认',
    [ScanBatchAttributionReviewStatusCode.BOUND_INCOMPLETE]: '已绑定但页数不齐',
    [ScanBatchAttributionReviewStatusCode.BOUND_COMPLETE]: '已绑定且完整',
    [ScanBatchAttributionReviewStatusCode.SUSPECTED_MIXED]: '疑似混扫',
  }
