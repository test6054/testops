/** 归档卷详情左栏 Tab 键，与后端 ArchiveVolumeNavigationSummaryAssembler.CHAIN_TAB_KEYS 一致 */
export enum ArchiveVolumeDetailTabKey {
  MATERIALS = 'materials',
  SCORES = 'scores',
  INTEGRITY = 'integrity',
  STORAGE = 'storage',
  SCAN_BATCHES = 'scan-batches',
  SCAN_REVIEW = 'scan-review',
  TRANSFER = 'transfer',
  ACCESS = 'access',
  APPRAISAL = 'appraisal',
  EVENTS = 'events',
  OCR_SEARCH = 'ocr-search',
}

export const ARCHIVE_VOLUME_DETAIL_TAB_KEYS: ArchiveVolumeDetailTabKey[] = [
  ArchiveVolumeDetailTabKey.MATERIALS,
  ArchiveVolumeDetailTabKey.SCORES,
  ArchiveVolumeDetailTabKey.INTEGRITY,
  ArchiveVolumeDetailTabKey.STORAGE,
  ArchiveVolumeDetailTabKey.SCAN_BATCHES,
  ArchiveVolumeDetailTabKey.SCAN_REVIEW,
  ArchiveVolumeDetailTabKey.TRANSFER,
  ArchiveVolumeDetailTabKey.ACCESS,
  ArchiveVolumeDetailTabKey.APPRAISAL,
  ArchiveVolumeDetailTabKey.EVENTS,
  ArchiveVolumeDetailTabKey.OCR_SEARCH,
]

/** API 未返回 navigationSummary 时的本地兜底标签 */
export const ArchiveVolumeDetailTabDescription: Record<ArchiveVolumeDetailTabKey, string> = {
  [ArchiveVolumeDetailTabKey.MATERIALS]: '材料目录',
  [ArchiveVolumeDetailTabKey.SCORES]: '成绩证明',
  [ArchiveVolumeDetailTabKey.INTEGRITY]: '完整性/四性',
  [ArchiveVolumeDetailTabKey.STORAGE]: '档案柜位',
  [ArchiveVolumeDetailTabKey.SCAN_BATCHES]: '扫描批次',
  [ArchiveVolumeDetailTabKey.SCAN_REVIEW]: '扫描复核',
  [ArchiveVolumeDetailTabKey.TRANSFER]: '移交验收',
  [ArchiveVolumeDetailTabKey.ACCESS]: '查阅借阅',
  [ArchiveVolumeDetailTabKey.APPRAISAL]: '鉴定销毁',
  [ArchiveVolumeDetailTabKey.EVENTS]: '事件流水',
  [ArchiveVolumeDetailTabKey.OCR_SEARCH]: '内容检索',
}

export const ARCHIVE_VOLUME_DETAIL_SECTION_TABS = ARCHIVE_VOLUME_DETAIL_TAB_KEYS.map((key) => ({
  key,
  label: ArchiveVolumeDetailTabDescription[key],
}))
