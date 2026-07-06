import type { ArchiveVolumeEventTypeCode } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ArchiveVolumeEventTypeDescription } from '@/apis/mark/archive-volume'
import { strictEnumLabel } from '@/utils/strict-enum'

const ARCHIVE_VOLUME_EVENT_TYPE_TONE: Partial<Record<ArchiveVolumeEventTypeCode, BadgeTone>> = {
  VOLUME_CREATED: 'blue',
  VOLUME_AUTO_CREATED: 'blue',
  AUTO_CREATE_FAILED: 'red',
  MATERIAL_REGISTERED: 'green',
  IMPORT_BATCH: 'blue',
  INTEGRITY_CHECKED: 'blue',
  SCORE_CONFIRMED: 'green',
  SUBMITTED: 'purple',
  TRANSFER_APPROVED: 'green',
  TRANSFER_REJECTED: 'red',
  FOUR_PROPERTY_CHECKED: 'blue',
  ACCESS_REQUESTED: 'orange',
  ACCESS_APPROVED: 'green',
  ACCESS_REJECTED: 'red',
  REMEDIATION_ASSIGNED: 'orange',
  REMEDIATION_CLOSED: 'gray',
  ARCHIVE_DUE_REMINDER: 'red',
  DELAY_SUBMISSION_OVERDUE: 'red',
  SELF_CHECK_CONFIRMED: 'green',
  VOLUME_RECOLLECTING: 'orange',
  SECURITY_LEVEL_CHANGED: 'orange',
  SECURITY_MARK_CONFIRMED: 'green',
}

export function archiveVolumeEventTypeLabel(code?: ArchiveVolumeEventTypeCode) {
  if (!code) {
    return '—'
  }
  return strictEnumLabel(ArchiveVolumeEventTypeDescription, code, 'eventType')
}

export function archiveVolumeEventTypeTone(code?: ArchiveVolumeEventTypeCode): BadgeTone {
  if (!code) {
    return 'gray'
  }
  return ARCHIVE_VOLUME_EVENT_TYPE_TONE[code] ?? 'blue'
}
