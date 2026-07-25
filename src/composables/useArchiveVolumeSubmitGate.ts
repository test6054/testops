import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeResponse,
  ArchiveVolumeSubmitChecklistItemVO,
} from '@/apis/mark/archive-volume'
import {
  ArchiveIntegrityStatusCode,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreSourceCode,
  ArchiveVolumeStatusCode,
} from '@/apis/mark/archive-volume'

interface SubmitGateInput {
  volume: Pick<
    ArchiveVolumeResponse,
    | 'volumeStatus'
    | 'responsibleUserId'
    | 'integrityStatus'
    | 'submitReady'
    | 'submitBlockHint'
    | 'hasBlockingRemediationForSubmit'
    | 'scoreSubmitReady'
    | 'scoreSource'
    | 'scoreCompletionStatus'
    | 'scoreProofFileId'
    | 'examGateOpen'
    | 'fourPropertyStale'
    | 'securityMarkPending'
    | 'requireSelfCheckConfirm'
    | 'selfCheckConfirmed'
    | 'signOffReady'
    | 'canSubmitVolume'
    | 'departmentReviewEnabled'
  >
  currentUserId: string
  /** 详情页 capabilities.canSubmitVolume，优先于 responsibleUserId 旧门禁 */
  canSubmitVolumeCapability?: boolean
  /** 租户/院系是否启用院系审核；列表/详情 capabilities 或卷响应 */
  departmentReviewEnabled?: boolean
  volumeRole?: ArchiveVolumeResponse['volumeRole']
  fourPropertyStale?: boolean
  fourPropertyPassed?: boolean
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
 * 列表与详情共用的「提交归档」门禁，与后端 capabilities + 提交前置条件对齐。
 */
export function canSubmitArchiveVolume(input: SubmitGateInput): boolean {
  const { volume, fourPropertyStale, fourPropertyPassed } = input
  const departmentReviewEnabled = resolveDepartmentReviewEnabled(input)
  const blockingRemediation
    = input.hasBlockingRemediationForSubmit ?? volume.hasBlockingRemediationForSubmit
  if (!volumeStatusAllowsSubmit(volume.volumeStatus, departmentReviewEnabled)) return false
  if (blockingRemediation === true) return false
  if (canActAsSubmitOwner(input) !== true) return false
  if (volume.submitReady === true) return true
  if (volume.submitReady === false) return false
  if (fourPropertyStale === true) return false
  if (volume.securityMarkPending === true) return false
  if (fourPropertyPassed !== true) return false
  if (
    volume.integrityStatus !== ArchiveIntegrityStatusCode.PASSED
    && volume.integrityStatus !== ArchiveIntegrityStatusCode.WAIVED
  ) {
    return false
}
  if (!isScoreSubmitReady(volume)) return false
  if (volume.requireSelfCheckConfirm === true) {
    if (volume.selfCheckConfirmed !== true || volume.signOffReady !== true) {
      return false
    }
  }
  return true
}

/** 与后端 assertScoreProof / submitReady 成绩分支一致 */
export function isScoreSubmitReady(
  volume: Pick<
    ArchiveVolumeResponse,
    | 'scoreSource'
    | 'scoreCompletionStatus'
    | 'scoreProofFileId'
    | 'examGateOpen'
    | 'scoreSubmitReady'
  >,
): boolean {
  if (volume.scoreSubmitReady === true) return true
  if (volume.scoreSubmitReady === false) return false
  if (volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL) {
    return volume.examGateOpen === true
  }
  if (
    volume.scoreSource === ArchiveScoreSourceCode.TEACHING_AFFAIRS
    || volume.scoreSource === ArchiveScoreSourceCode.OFFLINE_CONFIRMED
  ) {
    if (
      volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.COMPLETED
      || volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.VERIFIED
    ) {
      return true
    }
    return !!volume.scoreProofFileId
  }
  return true
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

  const checklistMessage = findFirstBlockingMessage(input.blockingItems)
  if (checklistMessage) {
    return checklistMessage
  }
  if (volume.submitBlockHint) {
    return volume.submitBlockHint
  }

  if (volume.submitReady === false) {
    if (volume.requireSelfCheckConfirm === true && volume.selfCheckConfirmed !== true) {
      return '请先完成提交前自查确认'
    }
    if (volume.requireSelfCheckConfirm === true && volume.signOffReady === false) {
      return '签字核查项未全部确认'
    }
    return '提交前置未满足，请完成编目、自查与完整性/四性/成绩检查'
  }

  if (
    volume.integrityStatus !== ArchiveIntegrityStatusCode.PASSED
    && volume.integrityStatus !== ArchiveIntegrityStatusCode.WAIVED
  ) {
    return '完整性未通过，请先执行完整性检查或授权豁免'
  }
  if ((input.fourPropertyStale ?? volume.fourPropertyStale) === true) {
    return '四性结论已失效，请重新检测'
  }
  if (volume.securityMarkPending === true) {
    return '密级定密待确认，请先完成定密确认并重新执行四性检测'
  }
  const fourPassed = input.fourPropertyPassed === true ? true : input.fourPropertyPassed === false ? false : undefined
  if (fourPassed === false) {
    return '四性检测未通过，请先执行四性检测'
  }
  if (!isScoreSubmitReady(volume)) {
    if (volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL) {
      return '线上阅卷双门禁未满足，暂不可提交'
    }
    return '成绩证明未完成，请先确认成绩或上传证明文件'
  }
  if (volume.requireSelfCheckConfirm === true && volume.selfCheckConfirmed !== true) {
    return '请先完成提交前自查确认'
  }
  if (volume.requireSelfCheckConfirm === true && volume.signOffReady === false) {
    return '签字核查项未全部确认'
  }
  return null
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
    volumeRole: record.volumeRole,
    fourPropertyStale: record.fourPropertyStale,
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
    volumeRole: detail.volumeRole,
    fourPropertyStale: detail.fourPropertyStale,
    fourPropertyPassed: detail.latestFourPropertyCheck?.overallPassed === true ? true : detail.latestFourPropertyCheck?.overallPassed === false ? false : undefined,
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
    volumeRole: detail.volumeRole,
    fourPropertyStale: detail.fourPropertyStale,
    fourPropertyPassed: detail.latestFourPropertyCheck?.overallPassed === true ? true : detail.latestFourPropertyCheck?.overallPassed === false ? false : undefined,
    hasBlockingRemediationForSubmit: detail.hasBlockingRemediationForSubmit,
    blockingItems,
  })
}
