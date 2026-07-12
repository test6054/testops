import type { ArchiveDutyGrantResponse } from '@/apis/mark/archive-config'

/** 与后端 resolveListDepartmentScope 一致：任一 tenantWide 职责或至少一个院系 scope 才可查看院系待办队列 */
export function canViewArchiveDepartmentQueueFromGrants(
  grants: ArchiveDutyGrantResponse[],
): boolean {
  if (grants.length === 0) {
    return false
  }
  if (grants.some((item) => item.tenantWide)) {
    return true
  }
  return grants.some((item) => Boolean(item.scopeDepartmentId))
}
