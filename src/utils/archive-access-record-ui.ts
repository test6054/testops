import type { ArchiveAccessStatusCode } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ARCHIVE_ACCESS_STATUS_TONE,
  ArchiveAccessStatusDescription,
} from '@/apis/mark/archive-volume'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

export function archiveAccessStatusLabel(code: ArchiveAccessStatusCode) {
  return strictEnumLabel(ArchiveAccessStatusDescription, code, 'accessStatus')
}

export function archiveAccessStatusTone(code: ArchiveAccessStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_ACCESS_STATUS_TONE, code, 'accessStatus')
}

export function archiveAccessApprovalCardClass(status: ArchiveAccessStatusCode): string {
  if (status === 'PENDING') {
    return 'approval-card--pending'
  }
  if (status === 'ACTIVE') {
    return 'approval-card--approved'
  }
  if (status === 'REJECTED') {
    return 'approval-card--rejected'
  }
  return ''
}

export function archiveAccessApplicantLabel(
  nickName?: string,
  identifier?: string,
  userId?: string,
): string {
  return nickName || identifier || userId || '—'
}
