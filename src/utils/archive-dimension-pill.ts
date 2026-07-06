import type {
  ArchiveAppraisalStatusCode,
  ArchiveIntegrityStatusCode,
  ArchiveTransferStatusCode,
  ArchiveVolumeResponse,
  ArchiveVolumeStatusCode,
} from '@/apis/mark/archive-volume'
import {
  ArchiveAppraisalStatusDescription,
  ArchiveIntegrityStatusDescription,
  ArchiveTransferStatusDescription,
  ArchiveVolumeStatusDescription,
} from '@/apis/mark/archive-volume'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 原型 dim-pill 语义色，对应 exam-prototype.html `.dim-pill--*`。 */
export type ArchiveDimPillTone = 'ok' | 'warn' | 'info' | 'pending' | 'error'

export interface ArchiveDimPillItem {
  tone: ArchiveDimPillTone
  label: string
}

export function volumeStatusDimTone(status: ArchiveVolumeStatusCode): ArchiveDimPillTone {
  if (status === 'STORED' || status === 'ARCHIVED_DESTROYED') {
    return 'ok'
  }
  if (status === 'SUBMITTED') {
    return 'info'
  }
  if (status === 'COLLECTING') {
    return 'warn'
  }
  return 'pending'
}

export function integrityStatusDimTone(status: ArchiveIntegrityStatusCode): ArchiveDimPillTone {
  if (status === 'PASSED' || status === 'WAIVED') {
    return 'ok'
  }
  if (status === 'FAILED') {
    return 'error'
  }
  if (status === 'CHECKING') {
    return 'info'
  }
  return 'pending'
}

export function transferStatusDimTone(status: ArchiveTransferStatusCode): ArchiveDimPillTone {
  if (status === 'APPROVED') {
    return 'ok'
  }
  if (status === 'PENDING_REVIEW') {
    return 'info'
  }
  if (status === 'REJECTED') {
    return 'error'
  }
  return 'pending'
}

export function appraisalStatusDimTone(status: ArchiveAppraisalStatusCode): ArchiveDimPillTone {
  if (status === 'REMINDER_SENT' || status === 'REQUESTED') {
    return 'warn'
  }
  if (status === 'APPROVED' || status === 'OPINION_RECORDED') {
    return 'ok'
  }
  if (status === 'REJECTED') {
    return 'error'
  }
  return 'pending'
}

/** 组装列表「五维状态」dim-pill 行，顺序与原型一致。 */
export function buildArchiveVolumeDimPills(record: ArchiveVolumeResponse): ArchiveDimPillItem[] {
  const pills: ArchiveDimPillItem[] = [
    {
      tone: volumeStatusDimTone(record.volumeStatus),
      label: strictEnumLabel(ArchiveVolumeStatusDescription, record.volumeStatus, 'volumeStatus'),
    },
    {
      tone: integrityStatusDimTone(record.integrityStatus),
      label: strictEnumLabel(ArchiveIntegrityStatusDescription, record.integrityStatus, 'integrityStatus'),
    },
    {
      tone: transferStatusDimTone(record.transferStatus),
      label: strictEnumLabel(ArchiveTransferStatusDescription, record.transferStatus, 'transferStatus'),
    },
  ]
  if (record.appraisalStatus) {
    pills.push({
      tone: appraisalStatusDimTone(record.appraisalStatus),
      label: strictEnumLabel(ArchiveAppraisalStatusDescription, record.appraisalStatus, 'appraisalStatus'),
    })
  }
  if (record.hasOpenRemediationTask) {
    pills.push({ tone: 'warn', label: '待整改' })
  }
  if (record.securityMarkPending) {
    pills.push({ tone: 'warn', label: '定密待确认' })
  }
  if (record.securityLevel === 'CONFIDENTIAL') {
    pills.push({ tone: 'error', label: '机密' })
  }
  return pills
}
