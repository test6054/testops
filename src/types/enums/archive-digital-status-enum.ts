/** 档案电子化保管状态 - ArchiveDigitalStatusEnum */
export enum ArchiveDigitalStatusCode {
  PENDING = 'PENDING',
  DIGITIZED = 'DIGITIZED',
  ARCHIVED = 'ARCHIVED',
}

export const ALL_ARCHIVE_DIGITAL_STATUS_CODES: readonly ArchiveDigitalStatusCode[] = [
  ArchiveDigitalStatusCode.PENDING,
  ArchiveDigitalStatusCode.DIGITIZED,
  ArchiveDigitalStatusCode.ARCHIVED,
]

export const ArchiveDigitalStatusDescription: Record<ArchiveDigitalStatusCode, string> = {
  [ArchiveDigitalStatusCode.PENDING]: '待电子化',
  [ArchiveDigitalStatusCode.DIGITIZED]: '已电子化',
  [ArchiveDigitalStatusCode.ARCHIVED]: '已归档保管',
}
