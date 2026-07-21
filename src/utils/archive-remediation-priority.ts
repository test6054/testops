import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ArchiveRemediationPriorityCode } from '@/types/enums/archive-remediation-priority-enum'

export { ArchiveRemediationPriorityDescription } from '@/types/enums/archive-remediation-priority-enum'

export const ARCHIVE_REMEDIATION_PRIORITY_TONE: Record<ArchiveRemediationPriorityCode, BadgeTone>
  = {
    [ArchiveRemediationPriorityCode.HIGH]: 'red',
    [ArchiveRemediationPriorityCode.MEDIUM]: 'orange',
    [ArchiveRemediationPriorityCode.LOW]: 'gray',
  }

export function remediationPriorityCardClass(priority: ArchiveRemediationPriorityCode): string {
  return `remediation-card--${priority.toLowerCase()}`
}
