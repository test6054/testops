/** 扫描批次质量标记 */
export enum ScanBatchQualityFlagCode {
  NORMAL = 'NORMAL',
  SUSPECTED_MIXED = 'SUSPECTED_MIXED',
}

export const ALL_SCAN_BATCH_QUALITY_FLAG_CODES: readonly ScanBatchQualityFlagCode[] = [
  ScanBatchQualityFlagCode.NORMAL,
  ScanBatchQualityFlagCode.SUSPECTED_MIXED,
]

export const ScanBatchQualityFlagDescription: Record<ScanBatchQualityFlagCode, string> = {
  [ScanBatchQualityFlagCode.NORMAL]: '正常',
  [ScanBatchQualityFlagCode.SUSPECTED_MIXED]: '疑似混扫',
}

