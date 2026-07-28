/** 归档目录必交覆盖缺口类型，与后端 ArchiveCatalogCoverageGapKind 逐值一致 */
export enum ArchiveCatalogCoverageGapKindCode {
  TEMPLATE_NOT_CONFIGURED = 'TEMPLATE_NOT_CONFIGURED',
  REQUIRED_NOT_SUBMITTED = 'REQUIRED_NOT_SUBMITTED',
  REQUIRED_NOT_IN_CATALOG = 'REQUIRED_NOT_IN_CATALOG',
}

export const ALL_ARCHIVE_CATALOG_COVERAGE_GAP_KIND_CODES: readonly ArchiveCatalogCoverageGapKindCode[] = [
  ArchiveCatalogCoverageGapKindCode.TEMPLATE_NOT_CONFIGURED,
  ArchiveCatalogCoverageGapKindCode.REQUIRED_NOT_SUBMITTED,
  ArchiveCatalogCoverageGapKindCode.REQUIRED_NOT_IN_CATALOG,
]

export const ArchiveCatalogCoverageGapKindDescription: Record<ArchiveCatalogCoverageGapKindCode, string> = {
  [ArchiveCatalogCoverageGapKindCode.TEMPLATE_NOT_CONFIGURED]: '模板未配置',
  [ArchiveCatalogCoverageGapKindCode.REQUIRED_NOT_SUBMITTED]: '必交未收齐',
  [ArchiveCatalogCoverageGapKindCode.REQUIRED_NOT_IN_CATALOG]: '必交未编目',
}
