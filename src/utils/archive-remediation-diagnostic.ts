import { ArchiveRemediationDiagnosticDescription } from '@/apis/mark/archive-volume'
import { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 整改诊断码展示文案；未知码显式失败，禁止 UI 兜底英文码。 */
export function remediationDiagnosticLabel(code: ArchiveRemediationDiagnosticCode | undefined): string {
  if (!code) {
    return '—'
  }
  return strictEnumLabel(ArchiveRemediationDiagnosticDescription, code, 'diagnosticCode')
}

/** 是否属于密级/四性安全性整改，应引导至完整性 Tab 定密确认。 */
export function isSecurityRemediationDiagnostic(code: ArchiveRemediationDiagnosticCode | undefined): boolean {
  return (
    code === ArchiveRemediationDiagnosticCode.SECURITY_MARK
    || code === ArchiveRemediationDiagnosticCode.FOUR_PROPERTY_SECURITY
  )
}

/** 去卷内整改时应打开的详情 Tab。 */
export function remediationVolumeDetailTabKey(code: ArchiveRemediationDiagnosticCode | undefined): 'integrity' | 'materials' {
  return isSecurityRemediationDiagnostic(code) ? 'integrity' : 'materials'
}
