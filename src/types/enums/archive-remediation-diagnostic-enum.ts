/** 归档整改诊断码 */
export enum ArchiveRemediationDiagnosticCode {
  SECURITY_MARK = 'SECURITY_MARK',
  FOUR_PROPERTY_SECURITY = 'FOUR_PROPERTY_SECURITY',
  INTEGRITY_MISSING = 'INTEGRITY_MISSING',
  SUPERVISION = 'SUPERVISION',
}

export const ALL_ARCHIVE_REMEDIATION_DIAGNOSTIC_CODES: readonly ArchiveRemediationDiagnosticCode[] = [
  ArchiveRemediationDiagnosticCode.SECURITY_MARK,
  ArchiveRemediationDiagnosticCode.FOUR_PROPERTY_SECURITY,
  ArchiveRemediationDiagnosticCode.INTEGRITY_MISSING,
  ArchiveRemediationDiagnosticCode.SUPERVISION,
]
export const ArchiveRemediationDiagnosticDescription: Record<ArchiveRemediationDiagnosticCode, string> = {
  [ArchiveRemediationDiagnosticCode.SECURITY_MARK]: '密级标记待更新',
  [ArchiveRemediationDiagnosticCode.FOUR_PROPERTY_SECURITY]: '四性安全性未通过',
  [ArchiveRemediationDiagnosticCode.INTEGRITY_MISSING]: '完整性缺件',
  [ArchiveRemediationDiagnosticCode.SUPERVISION]: '督导问题',
}
