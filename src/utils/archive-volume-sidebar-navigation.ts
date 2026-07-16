import type { ArchiveVolumeSidebarTab } from '@/composables/useArchiveVolumeWorkbenchContext'
import type { ArchiveVolumeSidebarNavGroup } from '@/constants/archive-volume-sidebar-groups'
import {
  ARCHIVE_VOLUME_SIDEBAR_NAV_GROUPS,
  isArchiveVolumeSidebarTabVisible,
} from '@/constants/archive-volume-sidebar-groups'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'

export interface ArchiveVolumeSidebarNavGroupView {
  key: string
  label: string
  tabs: ArchiveVolumeSidebarTab[]
}

/**
 * 将后端 chainSteps 与卷内工具入口转为阶段分组侧栏，并按卷状态渐进披露。
 */
export function buildArchiveVolumeSidebarNavGroups(
  tabs: ArchiveVolumeSidebarTab[],
  volumeStatus: ArchiveVolumeStatusCode | undefined,
  departmentReviewEnabled?: boolean,
): ArchiveVolumeSidebarNavGroupView[] {
  const visibleTabs = tabs.filter((tab) => {
    if (tab.key === 'department-review' && departmentReviewEnabled === false) {
      const inReviewFlow =
        volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING ||
        volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
      if (!inReviewFlow) {
        return false
      }
    }
    return isArchiveVolumeSidebarTabVisible(tab.key, volumeStatus)
  })
  if (visibleTabs.length === 0) {
    return []
  }
  const tabByKey = new Map(visibleTabs.map((tab) => [tab.key, tab]))
  const groups: ArchiveVolumeSidebarNavGroupView[] = []
  for (const group of ARCHIVE_VOLUME_SIDEBAR_NAV_GROUPS) {
    const groupTabs = group.tabKeys
      .map((tabKey) => tabByKey.get(tabKey))
      .filter((tab): tab is ArchiveVolumeSidebarTab => tab != null)
    if (groupTabs.length === 0) {
      continue
    }
    groups.push({
      key: group.key,
      label: group.label,
      tabs: groupTabs,
    })
  }
  appendUngroupedTabs(groups, visibleTabs, ARCHIVE_VOLUME_SIDEBAR_NAV_GROUPS)
  return groups
}

function appendUngroupedTabs(
  groups: ArchiveVolumeSidebarNavGroupView[],
  visibleTabs: ArchiveVolumeSidebarTab[],
  definitions: ArchiveVolumeSidebarNavGroup[],
): void {
  const groupedKeys = new Set<string>(definitions.flatMap((group) => [...group.tabKeys]))
  const orphanTabs = visibleTabs.filter((tab) => !groupedKeys.has(tab.key))
  if (orphanTabs.length === 0) {
    return
  }
  groups.push({
    key: 'other',
    label: '其他',
    tabs: orphanTabs,
  })
}
