/** 电子原件状态 */
export enum ArchiveElectronicOriginalStatusCode {
  ORIGINAL = 'ORIGINAL',
  COPY = 'COPY',
  SCANNED = 'SCANNED',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_ARCHIVE_ELECTRONIC_ORIGINAL_STATUS_CODES: readonly ArchiveElectronicOriginalStatusCode[] = [
  ArchiveElectronicOriginalStatusCode.ORIGINAL,
  ArchiveElectronicOriginalStatusCode.COPY,
  ArchiveElectronicOriginalStatusCode.SCANNED,
  ArchiveElectronicOriginalStatusCode.UNKNOWN,
]

