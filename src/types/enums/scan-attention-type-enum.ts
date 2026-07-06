/** 扫描异常类型 */
export enum ScanAttentionTypeCode {
  QUALITY_BLOCK = 'QUALITY_BLOCK',
  PROCESSING_BLOCK = 'PROCESSING_BLOCK',
  DUPLICATE_PENDING = 'DUPLICATE_PENDING',
  RECOGNITION_REVIEW = 'RECOGNITION_REVIEW',
  BINDING_CONFLICT = 'BINDING_CONFLICT',
  MISSING_CANDIDATE_ROSTER = 'MISSING_CANDIDATE_ROSTER',
}

export const ALL_SCAN_ATTENTION_TYPE_CODES: readonly ScanAttentionTypeCode[] = [
  ScanAttentionTypeCode.QUALITY_BLOCK,
  ScanAttentionTypeCode.PROCESSING_BLOCK,
  ScanAttentionTypeCode.DUPLICATE_PENDING,
  ScanAttentionTypeCode.RECOGNITION_REVIEW,
  ScanAttentionTypeCode.BINDING_CONFLICT,
  ScanAttentionTypeCode.MISSING_CANDIDATE_ROSTER,
]

export const ScanAttentionTypeDescription: Record<ScanAttentionTypeCode, string> = {
  [ScanAttentionTypeCode.QUALITY_BLOCK]: '质量阻断',
  [ScanAttentionTypeCode.PROCESSING_BLOCK]: '处理阻断',
  [ScanAttentionTypeCode.DUPLICATE_PENDING]: '重复影像',
  [ScanAttentionTypeCode.RECOGNITION_REVIEW]: '识别复核',
  [ScanAttentionTypeCode.BINDING_CONFLICT]: '身份绑定冲突',
  [ScanAttentionTypeCode.MISSING_CANDIDATE_ROSTER]: '缺少考生名单',
}

