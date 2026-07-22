/** 四性检测 diagnostic JSON 维度键 */
/** 归档卷四性检测维度 - 与后端 ArchiveFourPropertyDimension 逐值对齐 */
export enum ArchiveFourPropertyDimensionCode {
  AUTHENTICITY = 'authenticity',
  INTEGRITY = 'integrity',
  USABILITY = 'usability',
  SECURITY = 'security',
}

export const ALL_ARCHIVE_FOUR_PROPERTY_DIMENSION_CODES: readonly ArchiveFourPropertyDimensionCode[] = [
  ArchiveFourPropertyDimensionCode.AUTHENTICITY,
  ArchiveFourPropertyDimensionCode.INTEGRITY,
  ArchiveFourPropertyDimensionCode.USABILITY,
  ArchiveFourPropertyDimensionCode.SECURITY,
]

export const ArchiveFourPropertyDimensionDescription: Record<ArchiveFourPropertyDimensionCode, string> = {
  [ArchiveFourPropertyDimensionCode.AUTHENTICITY]: '真实性',
  [ArchiveFourPropertyDimensionCode.INTEGRITY]: '完整性',
  [ArchiveFourPropertyDimensionCode.USABILITY]: '可用性',
  [ArchiveFourPropertyDimensionCode.SECURITY]: '安全性',
}
