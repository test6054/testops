import type { ArchiveVolumeResponse } from '@/apis/mark/archive-volume'
import {
  ArchiveAppraisalStatusCode,
  ArchiveAppraisalStatusDescription,
  ArchiveIntegrityStatusCode,
  ArchiveIntegrityStatusDescription,
  ArchiveTransferStatusCode,
  ArchiveTransferStatusDescription,
  ArchiveVolumeStatusCode,
  ArchiveVolumeStatusDescription
} from '@/apis/mark/archive-volume'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 原型 dim-pill 语义色，对应 exam-prototype.html `.dim-pill--*`。 */
export type ArchiveDimPillTone = 'ok' | 'warn' | 'info' | 'pending' | 'error'

export interface ArchiveDimPillItem {
  tone: ArchiveDimPillTone
  label: string
}

export function volumeStatusDimTone(status: ArchiveVolumeStatusCode): ArchiveDimPillTone {
  if (status === ArchiveVolumeStatusCode.STORED || status === ArchiveVolumeStatusCode.ARCHIVED_DESTROYED) {
    return 'ok'
  }
  if (status === ArchiveVolumeStatusCode.SUBMITTED || status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED) {
    return 'info'
  }
  if (status === ArchiveVolumeStatusCode.COLLECTING || status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING) {
    return 'warn'
  }
  return 'pending'
}

export function integrityStatusDimTone(status: ArchiveIntegrityStatusCode): ArchiveDimPillTone {
  if (status === ArchiveIntegrityStatusCode.PASSED || status === ArchiveIntegrityStatusCode.WAIVED) {
    return 'ok'
  }
  if (status === ArchiveIntegrityStatusCode.FAILED) {
    return 'error'
  }
  if (status === ArchiveIntegrityStatusCode.CHECKING) {
    return 'info'
  }
  return 'pending'
}

export function transferStatusDimTone(status: ArchiveTransferStatusCode): ArchiveDimPillTone {
  if (status === ArchiveTransferStatusCode.APPROVED) {
    return 'ok'
  }
  if (status === ArchiveTransferStatusCode.PENDING_REVIEW) {
    return 'info'
  }
  if (status === ArchiveTransferStatusCode.REJECTED) {
    return 'error'
  }
  return 'pending'
}

export function appraisalStatusDimTone(status: ArchiveAppraisalStatusCode): ArchiveDimPillTone {
  if (status === ArchiveAppraisalStatusCode.REMINDER_SENT || status === ArchiveAppraisalStatusCode.REQUESTED) {
    return 'warn'
  }
  if (status === ArchiveAppraisalStatusCode.APPROVED) {
    return 'ok'
  }
  if (status === ArchiveAppraisalStatusCode.OPINION_RECORDED) {
    return 'info'
  }
  if (status === ArchiveAppraisalStatusCode.REJECTED) {
    return 'error'
  }
  return 'pending'
}

/** 组装列表关键状态：保留主状态与真实阻塞，正常维度不重复染色。 */
export function buildArchiveVolumeDimPills(record: ArchiveVolumeResponse): ArchiveDimPillItem[] {
  const pills: ArchiveDimPillItem[] = [
    {
      tone: volumeStatusDimTone(record.volumeStatus),
      label: strictEnumLabel(ArchiveVolumeStatusDescription, record.volumeStatus, 'volumeStatus'),
    },
  ]
  if (
    record.integrityStatus === ArchiveIntegrityStatusCode.FAILED
    || record.integrityStatus === ArchiveIntegrityStatusCode.CHECKING
  ) {
    pills.push({
      tone: integrityStatusDimTone(record.integrityStatus),
      label: strictEnumLabel(ArchiveIntegrityStatusDescription, record.integrityStatus, 'integrityStatus'),
    })
  }
  if (
    record.transferStatus === ArchiveTransferStatusCode.PENDING_REVIEW
    || record.transferStatus === ArchiveTransferStatusCode.REJECTED
  ) {
    pills.push({
      tone: transferStatusDimTone(record.transferStatus),
      label: strictEnumLabel(ArchiveTransferStatusDescription, record.transferStatus, 'transferStatus'),
    })
  }
  if (
    record.appraisalStatus === ArchiveAppraisalStatusCode.REMINDER_SENT
    || record.appraisalStatus === ArchiveAppraisalStatusCode.REQUESTED
    || record.appraisalStatus === ArchiveAppraisalStatusCode.REJECTED
  ) {
    pills.push({
      tone: appraisalStatusDimTone(record.appraisalStatus),
      label: strictEnumLabel(ArchiveAppraisalStatusDescription, record.appraisalStatus, 'appraisalStatus'),
    })
  }
  if (record.hasOpenRemediationTask === true) {
    pills.push({ tone: 'warn', label: '待整改' })
  }
  if (record.securityMarkPending === true) {
    pills.push({ tone: 'warn', label: '定密待确认' })
  }
  if (record.securityLevel === 'CONFIDENTIAL') {
    pills.push({ tone: 'pending', label: '机密' })
  }
  return pills.slice(0, 4)
}
