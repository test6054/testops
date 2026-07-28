import type {
  ArchiveVolumeSubmitChecklistItemVO,
  ArchiveVolumeSubmitChecklistPhaseKey,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_VOLUME_DETAIL_TAB_KEYS,
  ArchiveVolumeDetailTabKey,
} from '@/constants/archive-volume-detail-tabs'
import { ArchiveVolumeSubmitChecklistActionTypeCode } from '@/types/enums/archive-volume-submit-checklist-action-type-enum'

export interface ArchiveSubmitChecklistRouteTarget {
  detailTabKey: ArchiveVolumeDetailTabKey
  checklistPhaseKey: ArchiveVolumeSubmitChecklistPhaseKey
}

/** 提交清单导航：详情 Tab，或跳转考试工作台成绩确认页。 */
export type ArchiveSubmitChecklistNavigation
  = | { kind: 'detailTab', target: ArchiveSubmitChecklistRouteTarget }
    | { kind: 'examWorkspace', examId: string, routeName: 'TeacherExamWorkspaceScoreSummary' }

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

/**
 * 解析提交清单阻塞项最终导航目标。
 * OPEN_EXAM_WORKSPACE 必须离开归档卷详情，进入考试工作台成绩确认主链。
 */
export function resolveSubmitChecklistNavigation(
  item: ArchiveVolumeSubmitChecklistItemVO,
  examId: string | undefined,
): ArchiveSubmitChecklistNavigation {
  if (item.actionType === ArchiveVolumeSubmitChecklistActionTypeCode.OPEN_EXAM_WORKSPACE) {
    if (!examId) {
      throw new Error('归档卷缺少 examId，无法跳转考试工作台处理门禁')
    }
    return {
      kind: 'examWorkspace',
      examId,
      routeName: 'TeacherExamWorkspaceScoreSummary',
    }
  }
  return {
    kind: 'detailTab',
    target: resolveSubmitChecklistRoute(item),
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
  if (item.actionType === ArchiveVolumeSubmitChecklistActionTypeCode.OPEN_EXAM_WORKSPACE) {
    return '处理考试门禁'
  }
  const routeTarget = target ?? resolveSubmitChecklistRoute(item)
  if (routeTarget.detailTabKey === ArchiveVolumeDetailTabKey.FOUR_PROPERTY) {
    if (item.dimension === 'FOUR_PROPERTY_SECURITY') return '确认密级定密'
    return '去四性检测'
  }
  if (routeTarget.checklistPhaseKey === 'integrity') {
    return '去完整性自检'
  }
  if (routeTarget.checklistPhaseKey === 'catalog') return '去编目'
  if (routeTarget.checklistPhaseKey === 'selfCheck') return '去自检清单'
  if (routeTarget.checklistPhaseKey === 'departmentReview') return '去院系审核'
  if (routeTarget.checklistPhaseKey === 'submit') return '去提交'
  return '去处理'
}

function normalizeDetailTabKey(raw?: string): ArchiveVolumeDetailTabKey | null {
  if (!raw) return null
  if (raw === 'catalog') return ArchiveVolumeDetailTabKey.MATERIALS
  if (raw === 'selfCheck') return ArchiveVolumeDetailTabKey.SELF_CHECK
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
  if (tab === ArchiveVolumeDetailTabKey.SELF_CHECK) return 'selfCheck'
  if (tab === ArchiveVolumeDetailTabKey.FOUR_PROPERTY) return 'integrity'
  if (tab === ArchiveVolumeDetailTabKey.TRANSFER) return 'submit'
  if (tab === ArchiveVolumeDetailTabKey.DEPARTMENT_REVIEW) return 'departmentReview'
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
    case 'DEPARTMENT_REVIEW':
      return 'departmentReview'
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
      return ArchiveVolumeDetailTabKey.FOUR_PROPERTY
    case 'INTEGRITY':
      return ArchiveVolumeDetailTabKey.INTEGRITY
    case 'REMEDIATION':
      return ArchiveVolumeDetailTabKey.MATERIALS
    case 'SCORE':
      return ArchiveVolumeDetailTabKey.SCORES
    case 'CATALOG_NOT_READY':
    case 'CATALOG':
      return ArchiveVolumeDetailTabKey.MATERIALS
    case 'SELF_CHECK_PENDING':
    case 'SELF_CHECK':
    case 'SELF_CHECK_FORM':
    case 'SIGN_OFF':
      return ArchiveVolumeDetailTabKey.SELF_CHECK
    case 'DEPARTMENT_REVIEW':
      return ArchiveVolumeDetailTabKey.DEPARTMENT_REVIEW
    default:
      return ArchiveVolumeDetailTabKey.MATERIALS
  }
}
