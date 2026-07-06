/** 归档目录状态 */
export enum ArchiveCatalogStatusCode {
  NOT_STARTED = 'NOT_STARTED',
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

export const ALL_ARCHIVE_CATALOG_STATUS_CODES: readonly ArchiveCatalogStatusCode[] = [
  ArchiveCatalogStatusCode.NOT_STARTED,
  ArchiveCatalogStatusCode.DRAFT,
  ArchiveCatalogStatusCode.CONFIRMED,
]
export const ArchiveCatalogStatusDescription: Record<ArchiveCatalogStatusCode, string> = {
  [ArchiveCatalogStatusCode.NOT_STARTED]: '未开始',
  [ArchiveCatalogStatusCode.DRAFT]: '草稿',
  [ArchiveCatalogStatusCode.CONFIRMED]: '已确认',
}


