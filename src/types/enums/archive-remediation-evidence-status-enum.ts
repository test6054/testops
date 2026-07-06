/** 归档整改证据状态 */
export enum ArchiveRemediationEvidenceStatusCode {
  UPLOADED = 'UPLOADED',
  VERIFIED = 'VERIFIED',
}

export const ALL_ARCHIVE_REMEDIATION_EVIDENCE_STATUS_CODES: readonly ArchiveRemediationEvidenceStatusCode[] = [
  ArchiveRemediationEvidenceStatusCode.UPLOADED,
  ArchiveRemediationEvidenceStatusCode.VERIFIED,
]

export const ArchiveRemediationEvidenceStatusDescription: Record<ArchiveRemediationEvidenceStatusCode, string> = {
  [ArchiveRemediationEvidenceStatusCode.UPLOADED]: '已上传',
  [ArchiveRemediationEvidenceStatusCode.VERIFIED]: '已验证',
}

