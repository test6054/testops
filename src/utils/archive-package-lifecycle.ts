import type { ArchiveLifecycleStep } from '@/utils/archive-volume-lifecycle'
import { ArchivePackageStatusCode } from '@/types/enums/archive-package-status-enum'

const ARCHIVE_PACKAGE_LIFECYCLE_DEFINITIONS: Array<{
  key: string
  label: string
  statuses: ArchivePackageStatusCode[]
}> = [
  { key: 'draft', label: '草稿', statuses: [ArchivePackageStatusCode.DRAFT] },
  {
    key: 'packaging',
    label: '打包中',
    statuses: [ArchivePackageStatusCode.PACKAGING, ArchivePackageStatusCode.PACKAGING_FAILED],
  },
  { key: 'stored', label: '已投递', statuses: [ArchivePackageStatusCode.STORED] },
  { key: 'active', label: '保管中', statuses: [ArchivePackageStatusCode.ACTIVE] },
  {
    key: 'appraisal-pending',
    label: '鉴定待办',
    statuses: [ArchivePackageStatusCode.APPRAISAL_PENDING],
  },
  {
    key: 'appraisal-decided',
    label: '鉴定完成',
    statuses: [ArchivePackageStatusCode.APPRAISAL_DECIDED],
  },
  {
    key: 'destruction-pending',
    label: '销毁待批',
    statuses: [ArchivePackageStatusCode.DESTRUCTION_PENDING],
  },
  {
    key: 'destruction-approved',
    label: '销毁批准',
    statuses: [ArchivePackageStatusCode.DESTRUCTION_APPROVED],
  },
  {
    key: 'destruction-executing',
    label: '销毁执行',
    statuses: [
      ArchivePackageStatusCode.DESTRUCTION_EXECUTING,
      ArchivePackageStatusCode.DESTRUCTION_FAILED,
    ],
  },
  { key: 'destroyed', label: '已销毁', statuses: [ArchivePackageStatusCode.DESTROYED] },
]
/** 由考后归档包状态推导原型 lifecycle-pipe 步骤。 */
export function buildArchivePackageLifecycleSteps(
  status?: ArchivePackageStatusCode,
): ArchiveLifecycleStep[] {
  if (!status) {
    return buildEmptyArchivePackageLifecycleSteps()
  }
  const activeDefinitionIndex = ARCHIVE_PACKAGE_LIFECYCLE_DEFINITIONS.findIndex((definition) =>
    definition.statuses.includes(status),
  )
  if (activeDefinitionIndex < 0) {
    return []
  }
  const isFailed
    = status === ArchivePackageStatusCode.PACKAGING_FAILED
      || status === ArchivePackageStatusCode.DESTRUCTION_FAILED
  return ARCHIVE_PACKAGE_LIFECYCLE_DEFINITIONS.map((definition, index) => {
    let stepStatus: ArchiveLifecycleStep['status']
    if (status === ArchivePackageStatusCode.DESTROYED) {
      stepStatus = index <= activeDefinitionIndex ? 'done' : 'pending'
    } else if (index < activeDefinitionIndex) {
      stepStatus = 'done'
    } else if (index === activeDefinitionIndex) {
      stepStatus = isFailed ? 'warn' : 'active'
    } else {
      stepStatus = 'pending'
    }
    return {
      key: definition.key,
      label: definition.label,
      status: stepStatus,
    }
  })
}

/** 无归档包时展示全部待办生命周期步骤。 */
export function buildEmptyArchivePackageLifecycleSteps(): ArchiveLifecycleStep[] {
  return ARCHIVE_PACKAGE_LIFECYCLE_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    status: 'pending' as const,
  }))
}
