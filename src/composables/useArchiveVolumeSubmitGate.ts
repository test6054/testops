import type { ArchiveVolumeDetailVO, ArchiveVolumeVO } from '@/apis/mark/archive-volume'

interface SubmitGateInput {
  volume: Pick<ArchiveVolumeVO,
  'volumeStatus' | 'responsibleUserId' | 'integrityStatus' | 'submitReady'
  | 'hasBlockingRemediationForSubmit' | 'scoreSubmitReady' | 'scoreSource' | 'scoreCompletionStatus'
  | 'scoreProofFileId' | 'examGateOpen' | 'fourPropertyStale'
  | 'requireSelfCheckConfirm' | 'selfCheckConfirmed' | 'signOffReady'>
  currentUserId: string
  fourPropertyStale?: boolean
  fourPropertyPassed?: boolean
  hasBlockingRemediationForSubmit?: boolean
}

/**
 * 列表与详情共用的「提交归档」门禁，与后端 submit 前置条件对齐。
 */
export function canSubmitArchiveVolume(input: SubmitGateInput): boolean {
  const { volume, currentUserId, fourPropertyStale, fourPropertyPassed } = input
  const blockingRemediation = input.hasBlockingRemediationForSubmit
    ?? volume.hasBlockingRemediationForSubmit
  if (volume.volumeStatus !== 'COLLECTING') return false
  if (blockingRemediation) return false
  if (volume.responsibleUserId !== currentUserId) return false
  if (volume.submitReady === true) return true
  if (volume.submitReady === false) return false
  if (fourPropertyStale) return false
  if (!fourPropertyPassed) return false
  if (volume.integrityStatus !== 'PASSED' && volume.integrityStatus !== 'WAIVED') return false
  return isScoreSubmitReady(volume)
}

/** 与后端 assertScoreProof / submitReady 成绩分支一致 */
export function isScoreSubmitReady(
  volume: Pick<ArchiveVolumeVO, 'scoreSource' | 'scoreCompletionStatus' | 'scoreProofFileId' | 'examGateOpen' | 'scoreSubmitReady'>,
): boolean {
  if (volume.scoreSubmitReady === true) return true
  if (volume.scoreSubmitReady === false) return false
  if (volume.scoreSource === 'MARK_INTERNAL') {
    return volume.examGateOpen === true
  }
  if (volume.scoreSource === 'TEACHING_AFFAIRS' || volume.scoreSource === 'OFFLINE_CONFIRMED') {
    if (volume.scoreCompletionStatus === 'COMPLETED' || volume.scoreCompletionStatus === 'VERIFIED') {
      return true
    }
    return !!volume.scoreProofFileId
  }
  return true
}

export function describeSubmitBlockReason(input: SubmitGateInput): string | null {
  const { volume, currentUserId } = input
  if (volume.volumeStatus !== 'COLLECTING') return null
  if (input.hasBlockingRemediationForSubmit ?? volume.hasBlockingRemediationForSubmit) {
    return '存在未关闭整改任务，须关闭后再提交'
  }
  if (volume.responsibleUserId !== currentUserId) return null
  if (volume.integrityStatus !== 'PASSED' && volume.integrityStatus !== 'WAIVED') {
    return '完整性未通过，请先执行完整性检查或授权豁免'
  }
  if (input.fourPropertyStale ?? volume.fourPropertyStale) {
    return '四性结论已失效，请重新检测'
  }
  const fourPassed = input.fourPropertyPassed
    ?? (volume.submitReady === true ? true : undefined)
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

export function canSubmitArchiveVolumeRow(record: ArchiveVolumeVO, currentUserId: string): boolean {
  return canSubmitArchiveVolume({
    volume: record,
    currentUserId,
    fourPropertyStale: record.fourPropertyStale,
    hasBlockingRemediationForSubmit: record.hasBlockingRemediationForSubmit,
  })
}

export function canSubmitArchiveVolumeDetail(
  detail: ArchiveVolumeDetailVO,
  currentUserId: string,
): boolean {
  return canSubmitArchiveVolume({
    volume: detail.volume,
    currentUserId,
    fourPropertyStale: detail.fourPropertyStale,
    fourPropertyPassed: detail.latestFourPropertyCheck?.overallPassed,
    hasBlockingRemediationForSubmit: detail.hasBlockingRemediationForSubmit,
  })
}
