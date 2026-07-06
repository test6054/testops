import type { ArchiveVolumeVO } from '@/apis/mark/archive-volume'

/** 列表行左侧 urgency 色带：到期鉴定 > 收集中 > 完整性失败 > 已提交。 */
export type ArchiveVolumeListRowBorderTone = 'error' | 'warning' | 'info' | 'none'

/** 是否应在列表行展示 urgency 标签（待处理/待鉴定）。 */
export function isArchiveVolumeListUrgent(record: ArchiveVolumeVO): boolean {
  return (
    record.volumeStatus === 'COLLECTING'
    || record.integrityStatus === 'FAILED'
    || record.appraisalStatus === 'REMINDER_SENT'
  )
}

export function resolveArchiveVolumeListRowBorderTone(
  record: ArchiveVolumeVO,
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

export function archiveVolumeListRowClassName(record: ArchiveVolumeVO): string {
  const tone = resolveArchiveVolumeListRowBorderTone(record)
  if (tone === 'none') {
    return ''
  }
  return `archive-volume-list__row--${tone}`
}
