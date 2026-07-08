import type { ArchiveVolumeResponse } from '@/apis/mark/archive-volume'

/** 归档时限临期天数（列表 Badge 展示） */
export const ARCHIVE_DUE_SOON_LEAD_DAYS = 30

/** 判断归档截止是否已逾期 */
export function isArchiveDueOverdue(archiveDueTime?: string): boolean {
  if (!archiveDueTime) return false
  return new Date(archiveDueTime).getTime() < Date.now()
}

/** 判断归档截止是否临期（未逾期且在 leadDays 内） */
export function isArchiveDueSoon(archiveDueTime?: string, leadDays = ARCHIVE_DUE_SOON_LEAD_DAYS): boolean {
  if (!archiveDueTime || isArchiveDueOverdue(archiveDueTime)) return false
  const dueMs = new Date(archiveDueTime).getTime()
  const leadMs = leadDays * 24 * 60 * 60 * 1000
  return dueMs - Date.now() <= leadMs
}
export type ArchiveVolumeListRowBorderTone = 'error' | 'warning' | 'info' | 'none'

/** 是否应在列表行展示 urgency 标签（待处理/待鉴定）。 */
export function isArchiveVolumeListUrgent(record: ArchiveVolumeResponse): boolean {
  return (
    record.volumeStatus === 'COLLECTING'
    || record.integrityStatus === 'FAILED'
    || record.appraisalStatus === 'REMINDER_SENT'
  )
}

export function resolveArchiveVolumeListRowBorderTone(
  record: ArchiveVolumeResponse,
): ArchiveVolumeListRowBorderTone {
  if (record.appraisalStatus === 'REMINDER_SENT') {
    return 'error'
  }
  if (record.volumeStatus === 'COLLECTING') {
    return 'warning'
  }
  if (record.integrityStatus === 'FAILED') {
    return 'error'
  }
  if (record.volumeStatus === 'SUBMITTED') {
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
