import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'

/** 详情侧栏 Tab 键；生命周期键与后端 chainSteps 对齐，ocr-search 是卷内工具入口。 */
export const ARCHIVE_VOLUME_SIDEBAR_TAB_KEYS = [
  'materials',
  'ocr-search',
  'task-settings',
  'collaborators',
  'start-collecting',
  'scores',
  'integrity',
  'self-check',
  'four-property',
  'department-review',
  'scan-batches',
  'scan-review',
  'transfer',
  'storage',
  'access',
  'appraisal',
  'events',
] as const

export type ArchiveVolumeSidebarTabKey = (typeof ARCHIVE_VOLUME_SIDEBAR_TAB_KEYS)[number]

/** 侧栏阶段分组：对标高校档案「收材准备→材料→质检→审核→移交→保管利用→审计」。 */
export interface ArchiveVolumeSidebarNavGroup {
  key: string
  label: string
  tabKeys: readonly ArchiveVolumeSidebarTabKey[]
}

export const ARCHIVE_VOLUME_SIDEBAR_NAV_GROUPS: ArchiveVolumeSidebarNavGroup[] = [
  {
    key: 'collect',
    label: '材料收齐',
    tabKeys: [
      'task-settings',
      'collaborators',
      'start-collecting',
      'materials',
      'scores',
      'scan-batches',
      'scan-review',
    ],
  },
  {
    key: 'tools',
    label: '卷内工具',
    tabKeys: ['ocr-search'],
  },
  {
    key: 'quality',
    label: '质检阶段',
    tabKeys: ['integrity', 'self-check', 'four-property'],
  },
  {
    key: 'review',
    label: '提交前审核',
    tabKeys: ['department-review'],
  },
  {
    key: 'handover',
    label: '移交入库',
    tabKeys: ['transfer', 'storage'],
  },
  {
    key: 'service',
    label: '保管利用',
    tabKeys: ['access', 'appraisal'],
  },
  {
    key: 'audit',
    label: '追溯审计',
    tabKeys: ['events'],
  },
]

const COLLECTING_VISIBLE_TABS: ReadonlySet<ArchiveVolumeSidebarTabKey> = new Set([
  'materials',
  'ocr-search',
  'task-settings',
  'collaborators',
  'scores',
  'integrity',
  'self-check',
  'four-property',
  'department-review',
  'scan-batches',
  'scan-review',
  'events',
])

const DRAFT_VISIBLE_TABS: ReadonlySet<ArchiveVolumeSidebarTabKey> = new Set([
  ...COLLECTING_VISIBLE_TABS,
  'start-collecting',
])

const SUBMITTED_VISIBLE_TABS: ReadonlySet<ArchiveVolumeSidebarTabKey> = new Set([
  ...COLLECTING_VISIBLE_TABS,
  'transfer',
])

const STORED_VISIBLE_TABS: ReadonlySet<ArchiveVolumeSidebarTabKey> = new Set([
  ...SUBMITTED_VISIBLE_TABS,
  'storage',
  'access',
  'appraisal',
])

/**
 * 按卷主状态渐进披露侧栏 Tab；深链 tab 不在集合内时仍允许路由打开，仅侧栏不展示入口。
 * 开始收材仅 DRAFT 展示。
 */
export function isArchiveVolumeSidebarTabVisible(
  tabKey: string,
  volumeStatus: ArchiveVolumeStatusCode | undefined,
): boolean {
  if (!ARCHIVE_VOLUME_SIDEBAR_TAB_KEYS.includes(tabKey as ArchiveVolumeSidebarTabKey)) {
    return false
  }
  const key = tabKey as ArchiveVolumeSidebarTabKey
  if (!volumeStatus || volumeStatus === ArchiveVolumeStatusCode.DRAFT) {
    return DRAFT_VISIBLE_TABS.has(key)
  }
  if (
    volumeStatus === ArchiveVolumeStatusCode.COLLECTING
    || volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
    || volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
  ) {
    return COLLECTING_VISIBLE_TABS.has(key)
  }
  if (volumeStatus === ArchiveVolumeStatusCode.SUBMITTED) {
    return SUBMITTED_VISIBLE_TABS.has(key)
  }
  return STORED_VISIBLE_TABS.has(key)
}

/** 收材/提交前阶段：仅展示分组侧栏 + SubmitProgressBand，不展示 Flow 管道与 LifecyclePipe。 */
export function isArchiveVolumeCollectPhase(
  volumeStatus: ArchiveVolumeStatusCode | undefined,
): boolean {
  if (!volumeStatus) {
    return true
  }
  return volumeStatus === ArchiveVolumeStatusCode.DRAFT
    || volumeStatus === ArchiveVolumeStatusCode.COLLECTING
    || volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
    || volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
}
