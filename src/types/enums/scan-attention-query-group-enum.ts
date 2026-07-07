/** 扫描异常查询分组 */
export enum ScanAttentionQueryGroupCode {
  ABNORMAL = 'ABNORMAL',
  DUPLICATE = 'DUPLICATE',
}

export const ALL_SCAN_ATTENTION_QUERY_GROUP_CODES: readonly ScanAttentionQueryGroupCode[] = [
  ScanAttentionQueryGroupCode.ABNORMAL,
  ScanAttentionQueryGroupCode.DUPLICATE,
]

export const ScanAttentionQueryGroupDescription: Record<ScanAttentionQueryGroupCode, string> = {
  [ScanAttentionQueryGroupCode.ABNORMAL]: '异常待办',
  [ScanAttentionQueryGroupCode.DUPLICATE]: '重复影像',
}

