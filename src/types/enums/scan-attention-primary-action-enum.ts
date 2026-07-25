/** 扫描异常主操作 - ScanAttentionPrimaryActionCode */
export enum ScanAttentionPrimaryActionCode {
  OPEN_BATCH_DETAIL = 'OPEN_BATCH_DETAIL',
  OPEN_MANUAL_SUPPLEMENT = 'OPEN_MANUAL_SUPPLEMENT',
  OPEN_IMAGE_LEDGER = 'OPEN_IMAGE_LEDGER',
  OPEN_REVIEW_CONFIRM = 'OPEN_REVIEW_CONFIRM',
  OPEN_CANDIDATE_ROSTER = 'OPEN_CANDIDATE_ROSTER',
  BIND_IDENTITY = 'BIND_IDENTITY',
  VIEW_DETAIL = 'VIEW_DETAIL',
}

export const ALL_SCAN_ATTENTION_PRIMARY_ACTION_CODES: readonly ScanAttentionPrimaryActionCode[] = [
  ScanAttentionPrimaryActionCode.OPEN_BATCH_DETAIL,
  ScanAttentionPrimaryActionCode.OPEN_MANUAL_SUPPLEMENT,
  ScanAttentionPrimaryActionCode.OPEN_IMAGE_LEDGER,
  ScanAttentionPrimaryActionCode.OPEN_REVIEW_CONFIRM,
  ScanAttentionPrimaryActionCode.OPEN_CANDIDATE_ROSTER,
  ScanAttentionPrimaryActionCode.BIND_IDENTITY,
  ScanAttentionPrimaryActionCode.VIEW_DETAIL,
]

export const ScanAttentionPrimaryActionDescription: Record<ScanAttentionPrimaryActionCode, string> = {
  [ScanAttentionPrimaryActionCode.OPEN_BATCH_DETAIL]: '进入批次页轨',
  [ScanAttentionPrimaryActionCode.OPEN_MANUAL_SUPPLEMENT]: '去补扫替换',
  [ScanAttentionPrimaryActionCode.OPEN_IMAGE_LEDGER]: '去影像账本处置',
  [ScanAttentionPrimaryActionCode.OPEN_REVIEW_CONFIRM]: '文字识别/智能复核',
  [ScanAttentionPrimaryActionCode.OPEN_CANDIDATE_ROSTER]: '去维护考生名册',
  [ScanAttentionPrimaryActionCode.BIND_IDENTITY]: '身份绑定',
  [ScanAttentionPrimaryActionCode.VIEW_DETAIL]: '查看详情',
}
