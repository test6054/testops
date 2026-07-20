/** 归档卷详情左栏 Tab 键，与后端 ArchiveVolumeNavigationSummaryAssembler.CHAIN_TAB_KEYS 及规格 §4.5 一致 */
import { strictEnumLabel } from '@/utils/strict-enum'

export enum ArchiveVolumeDetailTabKey {
  MATERIALS = 'materials',
  OCR_SEARCH = 'ocr-search',
  TASK_SETTINGS = 'task-settings',
  COLLABORATORS = 'collaborators',
  START_COLLECTING = 'start-collecting',
  SCORES = 'scores',
  INTEGRITY = 'integrity',
  SELF_CHECK = 'self-check',
  FOUR_PROPERTY = 'four-property',
  SCAN_BATCHES = 'scan-batches',
  SCAN_REVIEW = 'scan-review',
  DEPARTMENT_REVIEW = 'department-review',
  TRANSFER = 'transfer',
  STORAGE = 'storage',
  ACCESS = 'access',
  APPRAISAL = 'appraisal',
  EVENTS = 'events',
}

export const ARCHIVE_VOLUME_DETAIL_TAB_KEYS: ArchiveVolumeDetailTabKey[] = [
  ArchiveVolumeDetailTabKey.MATERIALS,
  ArchiveVolumeDetailTabKey.OCR_SEARCH,
  ArchiveVolumeDetailTabKey.TASK_SETTINGS,
  ArchiveVolumeDetailTabKey.COLLABORATORS,
  ArchiveVolumeDetailTabKey.START_COLLECTING,
  ArchiveVolumeDetailTabKey.SCORES,
  ArchiveVolumeDetailTabKey.INTEGRITY,
  ArchiveVolumeDetailTabKey.SELF_CHECK,
  ArchiveVolumeDetailTabKey.FOUR_PROPERTY,
  ArchiveVolumeDetailTabKey.SCAN_BATCHES,
  ArchiveVolumeDetailTabKey.SCAN_REVIEW,
  ArchiveVolumeDetailTabKey.DEPARTMENT_REVIEW,
  ArchiveVolumeDetailTabKey.TRANSFER,
  ArchiveVolumeDetailTabKey.STORAGE,
  ArchiveVolumeDetailTabKey.ACCESS,
  ArchiveVolumeDetailTabKey.APPRAISAL,
  ArchiveVolumeDetailTabKey.EVENTS,
]

/** API 未返回 navigationSummary 时的本地兜底标签（与后端 CHAIN_LABELS 对齐） */
export const ArchiveVolumeDetailTabDescription: Record<ArchiveVolumeDetailTabKey, string> = {
  [ArchiveVolumeDetailTabKey.MATERIALS]: '材料收集',
  [ArchiveVolumeDetailTabKey.OCR_SEARCH]: '卷内检索',
  [ArchiveVolumeDetailTabKey.TASK_SETTINGS]: '任务设置',
  [ArchiveVolumeDetailTabKey.COLLABORATORS]: '协作管理',
  [ArchiveVolumeDetailTabKey.START_COLLECTING]: '开始收材',
  [ArchiveVolumeDetailTabKey.SCORES]: '成绩证明',
  [ArchiveVolumeDetailTabKey.INTEGRITY]: '完整性自检',
  [ArchiveVolumeDetailTabKey.SELF_CHECK]: '自检清单',
  [ArchiveVolumeDetailTabKey.FOUR_PROPERTY]: '四性与定密',
  [ArchiveVolumeDetailTabKey.SCAN_BATCHES]: '扫描批次',
  [ArchiveVolumeDetailTabKey.SCAN_REVIEW]: '扫描复核',
  [ArchiveVolumeDetailTabKey.DEPARTMENT_REVIEW]: '院系审核',
  [ArchiveVolumeDetailTabKey.TRANSFER]: '移交验收',
  [ArchiveVolumeDetailTabKey.STORAGE]: '入库归档',
  [ArchiveVolumeDetailTabKey.ACCESS]: '查阅借阅',
  [ArchiveVolumeDetailTabKey.APPRAISAL]: '鉴定销毁',
  [ArchiveVolumeDetailTabKey.EVENTS]: '事件流水',
}

/** 前端收材准备页签（不进后端 chainSteps，侧栏独立注入） */
export const ARCHIVE_VOLUME_MANAGE_TAB_KEYS: ArchiveVolumeDetailTabKey[] = [
  ArchiveVolumeDetailTabKey.TASK_SETTINGS,
  ArchiveVolumeDetailTabKey.COLLABORATORS,
  ArchiveVolumeDetailTabKey.START_COLLECTING,
]

export const ARCHIVE_VOLUME_PREPARE_TAB_KEYS = ARCHIVE_VOLUME_MANAGE_TAB_KEYS

export const ARCHIVE_VOLUME_DETAIL_SECTION_TABS = ARCHIVE_VOLUME_DETAIL_TAB_KEYS.map((key) => ({
  key,
  label: strictEnumLabel(ArchiveVolumeDetailTabDescription, key, '归档卷详情页签'),
}))
