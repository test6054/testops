import type { ArchiveVolumeResponse } from '@/apis/mark/archive-volume'
import {
  ArchiveAppraisalStatusCode,
  ArchiveIntegrityStatusCode,
  ArchiveVolumeStatusCode
} from '@/apis/mark/archive-volume'

/** 判断归档截止是否已逾期 */
export function isArchiveDueOverdue(archiveDueTime?: string): boolean {
  if (!archiveDueTime) return false
  return new Date(archiveDueTime).getTime() < Date.now()
}

/** 按后端院系时限策略判断归档截止是否临期。 */
export function isArchiveDueSoon(archiveDueTime: string | undefined, leadDays: number | undefined): boolean {
  if (!archiveDueTime || leadDays == null || leadDays <= 0 || isArchiveDueOverdue(archiveDueTime)) return false
  const dueMs = new Date(archiveDueTime).getTime()
  const leadMs = leadDays * 24 * 60 * 60 * 1000
  return dueMs - Date.now() <= leadMs
}
export type ArchiveVolumeListRowBorderTone = 'error' | 'warning' | 'info' | 'none'

/** 是否应在列表行展示 urgency 标签（待处理/待鉴定）。 */
export function isArchiveVolumeListUrgent(record: ArchiveVolumeResponse): boolean {
  return (
    record.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
    || record.integrityStatus === ArchiveIntegrityStatusCode.FAILED
    || record.appraisalStatus === ArchiveAppraisalStatusCode.REMINDER_SENT
  )
}

export function resolveArchiveVolumeListRowBorderTone(
  record: ArchiveVolumeResponse,
): ArchiveVolumeListRowBorderTone {
  if (record.appraisalStatus === ArchiveAppraisalStatusCode.REMINDER_SENT) {
    return 'error'
  }
  if (record.volumeStatus === ArchiveVolumeStatusCode.COLLECTING) {
    return 'warning'
  }
  if (record.integrityStatus === ArchiveIntegrityStatusCode.FAILED) {
    return 'error'
  }
  if (record.volumeStatus === ArchiveVolumeStatusCode.SUBMITTED) {
    return 'info'
  }
  return 'none'
}

export function archiveVolumeListRowClassName(record: ArchiveVolumeResponse): string {
  const tone = resolveArchiveVolumeListRowBorderTone(record)
  if (tone === 'none') {
    return ''
  }
  return `archive-volume-list__row--${tone}`
}
