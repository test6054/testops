import type { ArchiveVolumeDetailVO, ArchiveVolumeVO } from '@/apis/mark/archive-volume'

interface SubmitGateInput {
  volume: Pick<ArchiveVolumeVO,
    'volumeStatus' | 'responsibleUserId' | 'integrityStatus' | 'submitReady' | 'hasBlockingRemediationForSubmit'>
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
  return volume.integrityStatus === 'PASSED' || volume.integrityStatus === 'WAIVED'
}

export function canSubmitArchiveVolumeRow(record: ArchiveVolumeVO, currentUserId: string): boolean {
  return canSubmitArchiveVolume({
    volume: record,
    currentUserId,
    fourPropertyStale: record.fourPropertyStale,
    fourPropertyPassed: record.submitReady === true,
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
