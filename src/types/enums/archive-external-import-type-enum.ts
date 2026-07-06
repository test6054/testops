/** 归档外部导入类型 */
export enum ArchiveExternalImportTypeCode {
  VOLUME_MATERIAL = 'VOLUME_MATERIAL',
}

export const ALL_ARCHIVE_EXTERNAL_IMPORT_TYPE_CODES: readonly ArchiveExternalImportTypeCode[] = [
  ArchiveExternalImportTypeCode.VOLUME_MATERIAL,
]
export const ArchiveExternalImportTypeDescription: Record<ArchiveExternalImportTypeCode, string> = {
  [ArchiveExternalImportTypeCode.VOLUME_MATERIAL]: '归档卷材料批量导入',
}


