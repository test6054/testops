/** 归档材料载体类型 */
export enum ArchiveMaterialMediaTypeCode {
  PAPER = 'PAPER',
  ELECTRONIC = 'ELECTRONIC',
  AUDIO_VIDEO = 'AUDIO_VIDEO',
  OPTICAL_DISC = 'OPTICAL_DISC',
  MIXED = 'MIXED',
}

export const ALL_ARCHIVE_MATERIAL_MEDIA_TYPE_CODES: readonly ArchiveMaterialMediaTypeCode[] = [
  ArchiveMaterialMediaTypeCode.PAPER,
  ArchiveMaterialMediaTypeCode.ELECTRONIC,
  ArchiveMaterialMediaTypeCode.AUDIO_VIDEO,
  ArchiveMaterialMediaTypeCode.OPTICAL_DISC,
  ArchiveMaterialMediaTypeCode.MIXED,
]

