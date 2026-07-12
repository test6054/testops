/** 归档卷详情左栏 Tab 键，与后端 ArchiveVolumeNavigationSummaryAssembler.CHAIN_TAB_KEYS 一致 */
import { strictEnumLabel } from '@/utils/strict-enum'

export enum ArchiveVolumeDetailTabKey {
  MATERIALS = 'materials',
  SCORES = 'scores',
  INTEGRITY = 'integrity',
  DEPARTMENT_REVIEW = 'department-review',
  STORAGE = 'storage',
  SCAN_BATCHES = 'scan-batches',
  SCAN_REVIEW = 'scan-review',
  TRANSFER = 'transfer',
  ACCESS = 'access',
  APPRAISAL = 'appraisal',
  EVENTS = 'events',
}

export const ARCHIVE_VOLUME_DETAIL_TAB_KEYS: ArchiveVolumeDetailTabKey[] = [
  ArchiveVolumeDetailTabKey.MATERIALS,
  ArchiveVolumeDetailTabKey.SCORES,
  ArchiveVolumeDetailTabKey.INTEGRITY,
  ArchiveVolumeDetailTabKey.DEPARTMENT_REVIEW,
  ArchiveVolumeDetailTabKey.STORAGE,
  ArchiveVolumeDetailTabKey.SCAN_BATCHES,
  ArchiveVolumeDetailTabKey.SCAN_REVIEW,
  ArchiveVolumeDetailTabKey.TRANSFER,
  ArchiveVolumeDetailTabKey.ACCESS,
  ArchiveVolumeDetailTabKey.APPRAISAL,
  ArchiveVolumeDetailTabKey.EVENTS,
]

/** API 未返回 navigationSummary 时的本地兜底标签（与后端 CHAIN_LABELS 对齐） */
export const ArchiveVolumeDetailTabDescription: Record<ArchiveVolumeDetailTabKey, string> = {
  [ArchiveVolumeDetailTabKey.MATERIALS]: '材料收集',
  [ArchiveVolumeDetailTabKey.SCORES]: '成绩证明',
  [ArchiveVolumeDetailTabKey.INTEGRITY]: '完整性与四性',
  [ArchiveVolumeDetailTabKey.DEPARTMENT_REVIEW]: '院系审核',
  [ArchiveVolumeDetailTabKey.STORAGE]: '入库归档',
  [ArchiveVolumeDetailTabKey.SCAN_BATCHES]: '扫描批次',
  [ArchiveVolumeDetailTabKey.SCAN_REVIEW]: '扫描复核',
  [ArchiveVolumeDetailTabKey.TRANSFER]: '移交验收',
  [ArchiveVolumeDetailTabKey.ACCESS]: '查阅借阅',
  [ArchiveVolumeDetailTabKey.APPRAISAL]: '鉴定销毁',
  [ArchiveVolumeDetailTabKey.EVENTS]: '事件流水',
}

export const ARCHIVE_VOLUME_DETAIL_SECTION_TABS = ARCHIVE_VOLUME_DETAIL_TAB_KEYS.map((key) => ({
  key,
  label: strictEnumLabel(ArchiveVolumeDetailTabDescription, key, '归档卷详情页签'),
}))

/** 历史深链 tab=ocr-search 重定向至全局材料检索 scoped volumeId */
export const ARCHIVE_VOLUME_LEGACY_OCR_SEARCH_TAB = 'ocr-search'
