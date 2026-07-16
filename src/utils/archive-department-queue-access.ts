import type { ArchiveDutyGrantResponse } from '@/apis/mark/archive-config'
import { ArchiveDutyTypeCode } from '@/apis/mark/archive-config'

/** 院系待办队列只接受学院协调或部门档案员职责，其他岗位不得扩大入口范围。 */
export function canViewArchiveDepartmentQueueFromGrants(
  grants: ArchiveDutyGrantResponse[],
): boolean {
  return grants.some(item =>
    (item.dutyType === ArchiveDutyTypeCode.COLLEGE_COORDINATOR
      || item.dutyType === ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST)
    && (item.tenantWide === true || Boolean(item.scopeDepartmentId)),
  )
}
