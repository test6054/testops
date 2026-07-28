import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeResponse,
  ArchiveVolumeSubmitChecklistItemVO,
} from '@/apis/mark/archive-volume'
import {
  ArchiveVolumeStatusCode,
} from '@/apis/mark/archive-volume'

interface SubmitGateInput {
  volume: Pick<
    ArchiveVolumeResponse,
    | 'volumeStatus'
    | 'responsibleUserId'
    | 'submitReady'
    | 'submitBlockHint'
    | 'hasBlockingRemediationForSubmit'
    | 'scoreSubmitReady'
    | 'canSubmitVolume'
    | 'departmentReviewEnabled'
  >
  currentUserId: string
  /** 详情页 capabilities.canSubmitVolume，优先于 volume.canSubmitVolume */
  canSubmitVolumeCapability?: boolean
  /** 租户/院系是否启用院系审核；列表/详情 capabilities 或卷响应 */
  departmentReviewEnabled?: boolean
  hasBlockingRemediationForSubmit?: boolean
  blockingItems?: ArchiveVolumeSubmitChecklistItemVO[]
}

function findFirstBlockingMessage(
  blockingItems?: ArchiveVolumeSubmitChecklistItemVO[],
): string | null {
  if (!blockingItems?.length) {
    return null
  }
  for (const item of blockingItems) {
    if (item.passed !== true && item.message) {
      return item.message
    }
  }
  return null
}

function canActAsSubmitOwner(input: SubmitGateInput): boolean {
  return input.canSubmitVolumeCapability === true || input.volume.canSubmitVolume === true
}

function resolveDepartmentReviewEnabled(input: SubmitGateInput): boolean {
  return input.departmentReviewEnabled === true || input.volume.departmentReviewEnabled === true
}

/** 与后端 submitVolume 状态门禁一致 */
function volumeStatusAllowsSubmit(
  volumeStatus: ArchiveVolumeResponse['volumeStatus'],
  departmentReviewEnabled: boolean,
): boolean {
  if (departmentReviewEnabled) {
    return volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
  }
  return volumeStatus === ArchiveVolumeStatusCode.COLLECTING
}

/**
 * 列表与详情共用的「提交归档」门禁。
 * 提交就绪唯一真源为后端 volume.submitReady / scoreSubmitReady，禁止前端本地拼装清单结论。
 */
export function canSubmitArchiveVolume(input: SubmitGateInput): boolean {
  const { volume } = input
  const departmentReviewEnabled = resolveDepartmentReviewEnabled(input)
  const blockingRemediation
    = input.hasBlockingRemediationForSubmit ?? volume.hasBlockingRemediationForSubmit
  if (!volumeStatusAllowsSubmit(volume.volumeStatus, departmentReviewEnabled)) return false
  if (blockingRemediation === true) return false
  if (canActAsSubmitOwner(input) !== true) return false
  return volume.submitReady === true
}

/**
 * 成绩提交就绪唯一真源为后端 scoreSubmitReady；字段缺失不得本地降级放行。
 */
export function isScoreSubmitReady(
  volume: Pick<ArchiveVolumeResponse, 'scoreSubmitReady'>,
): boolean {
  return volume.scoreSubmitReady === true
}

export function describeSubmitBlockReason(input: SubmitGateInput): string | null {
  const { volume } = input
  const departmentReviewEnabled = resolveDepartmentReviewEnabled(input)
  if (!volumeStatusAllowsSubmit(volume.volumeStatus, departmentReviewEnabled)) {
    if (departmentReviewEnabled && volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING) {
      return '须先完成院系审核通过后再提交档案馆'
    }
    if (
      departmentReviewEnabled
      && volume.volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
    ) {
      return '院系审核进行中，请等待审核通过'
    }
    return null
  }
  if (input.hasBlockingRemediationForSubmit ?? volume.hasBlockingRemediationForSubmit) {
    return '存在未关闭整改任务，须关闭后再提交'
  }
  if (canActAsSubmitOwner(input) !== true) return null
  if (volume.submitReady === true) return null

  const checklistMessage = findFirstBlockingMessage(input.blockingItems)
  if (checklistMessage) {
    return checklistMessage
  }
  if (volume.submitBlockHint) {
    return volume.submitBlockHint
  }
  return '提交前置未满足，请完成编目、自查与完整性/四性/成绩检查'
}

export function canSubmitArchiveVolumeRow(
  record: ArchiveVolumeResponse,
  currentUserId: string,
): boolean {
  return canSubmitArchiveVolume({
    volume: record,
    currentUserId,
    canSubmitVolumeCapability: record.canSubmitVolume,
    departmentReviewEnabled: record.departmentReviewEnabled,
    hasBlockingRemediationForSubmit: record.hasBlockingRemediationForSubmit,
  })
}

export function canSubmitArchiveVolumeDetail(
  detail: ArchiveVolumeDetailResponse,
  currentUserId: string,
): boolean {
  return canSubmitArchiveVolume({
    volume: detail.volume,
    currentUserId,
    canSubmitVolumeCapability: detail.capabilities?.canSubmitVolume,
    departmentReviewEnabled:
      detail.capabilities?.departmentReviewEnabled ?? detail.volume.departmentReviewEnabled,
    hasBlockingRemediationForSubmit: detail.hasBlockingRemediationForSubmit,
  })
}

export function describeSubmitBlockReasonForDetail(
  detail: ArchiveVolumeDetailResponse,
  currentUserId: string,
  blockingItems?: ArchiveVolumeSubmitChecklistItemVO[],
): string | null {
  return describeSubmitBlockReason({
    volume: detail.volume,
    currentUserId,
    canSubmitVolumeCapability: detail.capabilities?.canSubmitVolume,
    departmentReviewEnabled:
      detail.capabilities?.departmentReviewEnabled ?? detail.volume.departmentReviewEnabled,
    hasBlockingRemediationForSubmit: detail.hasBlockingRemediationForSubmit,
    blockingItems,
  })
}
