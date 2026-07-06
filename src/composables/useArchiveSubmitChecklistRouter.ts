import type {
  ArchiveVolumeSubmitChecklistItemVO,
  ArchiveVolumeSubmitChecklistPhaseKey,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_VOLUME_DETAIL_TAB_KEYS,
  ArchiveVolumeDetailTabKey,
} from '@/constants/archive-volume-detail-tabs'

export interface ArchiveSubmitChecklistRouteTarget {
  detailTabKey: ArchiveVolumeDetailTabKey
  checklistPhaseKey: ArchiveVolumeSubmitChecklistPhaseKey
}

/** 将提交清单阻塞项映射到详情 Tab 与清单阶段键。 */
export function resolveSubmitChecklistRoute(
  item: ArchiveVolumeSubmitChecklistItemVO,
): ArchiveSubmitChecklistRouteTarget {
  const tab = normalizeDetailTabKey(item.targetTab)
  if (tab) {
    return {
      detailTabKey: tab,
      checklistPhaseKey: detailTabToChecklistPhase(tab),
    }
  }
  return {
    detailTabKey: dimensionToDetailTab(item.dimension),
    checklistPhaseKey: dimensionToChecklistPhase(item.dimension),
  }
}

/** 阻塞项操作按钮文案。 */
export function submitChecklistActionLabel(
  item: ArchiveVolumeSubmitChecklistItemVO,
  target?: ArchiveSubmitChecklistRouteTarget,
): string {
  if (item.actionLabel?.trim()) {
    return item.actionLabel.trim()
  }
  const routeTarget = target ?? resolveSubmitChecklistRoute(item)
  if (routeTarget.checklistPhaseKey === 'integrity') {
    if (item.dimension === 'FOUR_PROPERTY_SECURITY') return '确认密级定密'
    return '去四性检测'
  }
  if (routeTarget.checklistPhaseKey === 'catalog') return '去编目'
  if (routeTarget.checklistPhaseKey === 'selfCheck') return '去自查'
  if (routeTarget.checklistPhaseKey === 'submit') return '去提交'
  return '去处理'
}

function normalizeDetailTabKey(raw?: string): ArchiveVolumeDetailTabKey | null {
  if (!raw) return null
  if (raw === 'catalog' || raw === 'selfCheck') return ArchiveVolumeDetailTabKey.MATERIALS
  const matchedTab = ARCHIVE_VOLUME_DETAIL_TAB_KEYS.find((tabKey) => tabKey === raw)
  if (matchedTab) {
    return matchedTab
  }
  return null
}

function detailTabToChecklistPhase(
  tab: ArchiveVolumeDetailTabKey,
): ArchiveVolumeSubmitChecklistPhaseKey {
  if (tab === ArchiveVolumeDetailTabKey.INTEGRITY) return 'integrity'
  if (tab === ArchiveVolumeDetailTabKey.TRANSFER) return 'submit'
  if (tab === ArchiveVolumeDetailTabKey.SCORES) return 'materials'
  return 'materials'
}

function dimensionToChecklistPhase(dimension: string): ArchiveVolumeSubmitChecklistPhaseKey {
  switch (dimension) {
    case 'FOUR_PROPERTY':
    case 'FOUR_PROPERTY_SECURITY':
    case 'REMEDIATION':
      return 'integrity'
    case 'CATALOG_NOT_READY':
    case 'CATALOG':
      return 'catalog'
    case 'SELF_CHECK_PENDING':
    case 'SELF_CHECK':
    case 'SELF_CHECK_FORM':
    case 'SIGN_OFF':
      return 'selfCheck'
    case 'materials':
    case 'integrity':
    case 'submit':
      return dimension
    default:
      return 'materials'
  }
}

function dimensionToDetailTab(dimension: string): ArchiveVolumeDetailTabKey {
  switch (dimension) {
    case 'FOUR_PROPERTY':
    case 'FOUR_PROPERTY_SECURITY':
    case 'REMEDIATION':
      return ArchiveVolumeDetailTabKey.INTEGRITY
    case 'SCORE':
      return ArchiveVolumeDetailTabKey.SCORES
    case 'CATALOG_NOT_READY':
    case 'CATALOG':
    case 'SELF_CHECK_PENDING':
    case 'SELF_CHECK':
    case 'SELF_CHECK_FORM':
    case 'SIGN_OFF':
      return ArchiveVolumeDetailTabKey.MATERIALS
    default:
      return ArchiveVolumeDetailTabKey.MATERIALS
  }
}
