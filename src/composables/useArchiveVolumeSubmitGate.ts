import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeResponse,
  ArchiveVolumeRoleCode,
  ArchiveVolumeSubmitChecklistItemVO,
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
  >
  currentUserId: string
  /** 详情页 volumeRole=OWNER 含 responsibleUserId 与 VOLUME_OWNER grant，与后端 submit 权限对齐 */
  volumeRole?: ArchiveVolumeRoleCode
  fourPropertyStale?: boolean
  fourPropertyPassed?: boolean
  hasBlockingRemediationForSubmit?: boolean
  /** 详情页 checklist/preview 阻塞项，与后端 blockingItems 同源 */
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
  if (input.volumeRole === 'OWNER') {
    return true
  }
  return input.volume.responsibleUserId === input.currentUserId
}

/**
 * 列表与详情共用的「提交归档」门禁，与后端 submit 前置条件对齐。
 */
export function canSubmitArchiveVolume(input: SubmitGateInput): boolean {
  const { volume, fourPropertyStale, fourPropertyPassed } = input
  const blockingRemediation
    = input.hasBlockingRemediationForSubmit ?? volume.hasBlockingRemediationForSubmit
  if (volume.volumeStatus !== 'COLLECTING') return false
  if (blockingRemediation) return false
  if (!canActAsSubmitOwner(input)) return false
  if (volume.submitReady === true) return true
  if (volume.submitReady === false) return false
  if (fourPropertyStale) return false
  if (volume.securityMarkPending) return false
  if (!fourPropertyPassed) return false
  if (volume.integrityStatus !== 'PASSED' && volume.integrityStatus !== 'WAIVED') return false
  if (!isScoreSubmitReady(volume)) return false
  if (volume.requireSelfCheckConfirm) {
    if (!volume.selfCheckConfirmed || volume.signOffReady !== true) {
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
  if (volume.scoreSource === 'MARK_INTERNAL') {
    return volume.examGateOpen === true
  }
  if (volume.scoreSource === 'TEACHING_AFFAIRS' || volume.scoreSource === 'OFFLINE_CONFIRMED') {
    if (
      volume.scoreCompletionStatus === 'COMPLETED'
      || volume.scoreCompletionStatus === 'VERIFIED'
    ) {
      return true
    }
    return !!volume.scoreProofFileId
  }
  return true
}

export function describeSubmitBlockReason(input: SubmitGateInput): string | null {
  const { volume } = input
  if (volume.volumeStatus !== 'COLLECTING') return null
  if (input.hasBlockingRemediationForSubmit ?? volume.hasBlockingRemediationForSubmit) {
    return '存在未关闭整改任务，须关闭后再提交'
  }
  if (!canActAsSubmitOwner(input)) return null

  const checklistMessage = findFirstBlockingMessage(input.blockingItems)
  if (checklistMessage) {
    return checklistMessage
  }
  if (volume.submitBlockHint) {
    return volume.submitBlockHint
  }

  if (volume.submitReady === false) {
    if (volume.requireSelfCheckConfirm && !volume.selfCheckConfirmed) {
      return '请先完成提交前自查确认'
    }
    if (volume.requireSelfCheckConfirm && volume.signOffReady === false) {
      return '签字核查项未全部确认'
    }
    return '提交前置未满足，请完成编目、自查与完整性/四性/成绩检查'
  }

  if (volume.integrityStatus !== 'PASSED' && volume.integrityStatus !== 'WAIVED') {
    return '完整性未通过，请先执行完整性检查或授权豁免'
  }
  if (input.fourPropertyStale ?? volume.fourPropertyStale) {
    return '四性结论已失效，请重新检测'
  }
  if (volume.securityMarkPending) {
    return '密级定密待确认，请先完成定密确认并重新执行四性检测'
  }
  const fourPassed = input.fourPropertyPassed ?? (volume.submitReady === true ? true : undefined)
  if (fourPassed === false) {
    return '四性检测未通过，请先执行四性检测'
  }
  if (!isScoreSubmitReady(volume)) {
    if (volume.scoreSource === 'MARK_INTERNAL') {
      return '线上阅卷双门禁未满足，暂不可提交'
    }
    return '成绩证明未完成，请先确认成绩或上传证明文件'
  }
  if (volume.requireSelfCheckConfirm && !volume.selfCheckConfirmed) {
    return '请先完成提交前自查确认'
  }
  if (volume.requireSelfCheckConfirm && volume.signOffReady === false) {
    return '签字核查项未全部确认'
  }
  return null
}

export function canSubmitArchiveVolumeRow(record: ArchiveVolumeResponse, currentUserId: string): boolean {
  return canSubmitArchiveVolume({
    volume: record,
    currentUserId,
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
    volumeRole: detail.volumeRole,
    fourPropertyStale: detail.fourPropertyStale,
    fourPropertyPassed: detail.latestFourPropertyCheck?.overallPassed,
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
    volumeRole: detail.volumeRole,
    fourPropertyStale: detail.fourPropertyStale,
    fourPropertyPassed: detail.latestFourPropertyCheck?.overallPassed,
    hasBlockingRemediationForSubmit: detail.hasBlockingRemediationForSubmit,
    blockingItems,
  })
}
