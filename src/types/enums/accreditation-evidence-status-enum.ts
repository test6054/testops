/** 认证原始资料证据状态 - AccreditationEvidenceStatusEnum */
export enum AccreditationEvidenceStatusCode {
  ACTIVE = 'ACTIVE',
}

export const ALL_ACCREDITATION_EVIDENCE_STATUS_CODES: readonly AccreditationEvidenceStatusCode[] = [
  AccreditationEvidenceStatusCode.ACTIVE,
]

export const AccreditationEvidenceStatusDescription: Record<AccreditationEvidenceStatusCode, string> = {
  [AccreditationEvidenceStatusCode.ACTIVE]: '启用',
}
