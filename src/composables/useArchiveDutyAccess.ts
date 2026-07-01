import type {
  ArchiveDutyGrantVO,
  ArchiveDutyTypeCode,
  ArchiveSecurityPolicyVO,
} from '@/apis/mark/archive-config'
import { listArchiveSecurityPolicy, listMyArchiveDutyGrants } from '@/apis/mark/archive-config'
import type { ArchiveSecurityLevelCode } from '@/apis/mark/archive-volume'
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'

const ARCHIVE_SECURITY_LEVEL_ORDER: Record<ArchiveSecurityLevelCode, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  RESTRICTED: 2,
  CONFIDENTIAL: 3,
}

/**
 * 当前用户归档岗位职责，驱动 archive-volumes 岗位 Tab 可见性与范围过滤。
 */
export function useArchiveDutyAccess() {
  const userStore = useUserStore()
  const loading = ref(false)
  const grantsLoadFailed = ref(false)
  const grants = ref<ArchiveDutyGrantVO[]>([])
  const securityPolicies = ref<ArchiveSecurityPolicyVO[]>([])

  const dutyTypes = computed(() => new Set(grants.value.map((item) => item.dutyType)))

  function resolveScopedDepartmentIdsForDutyTypes(types: ArchiveDutyTypeCode[]): string[] {
    const relevant = grants.value.filter((item) => types.includes(item.dutyType))
    if (relevant.some((item) => item.tenantWide)) {
      return []
    }
    return [
      ...new Set(
        relevant
          .filter((item) => item.scopeDepartmentId)
          .map((item) => item.scopeDepartmentId as string),
      ),
    ]
  }

  const scopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes(['COLLEGE_COORDINATOR']),
  )

  /** 与后端 resolveListDepartmentScope 一致：任一 tenantWide 职责则不限院系，否则汇总全部 scopeDepartmentId */
  const listScopedDepartmentIds = computed(() => {
    if (grants.value.some((item) => item.tenantWide)) {
      return [] as string[]
    }
    return [
      ...new Set(
        grants.value
          .filter((item) => item.scopeDepartmentId)
          .map((item) => item.scopeDepartmentId as string),
      ),
    ]
  })

  const isTenantAdmin = computed(() => userStore.isTenantAdmin === true)

  const isTenantWideCollegeCoordinator = computed(() =>
    grants.value.some(
      (item) => item.dutyType === 'COLLEGE_COORDINATOR' && item.tenantWide === true,
    ),
  )

  function hasDuty(type: ArchiveDutyTypeCode): boolean {
    return dutyTypes.value.has(type)
  }

  function hasDutyForDepartment(dutyType: ArchiveDutyTypeCode, departmentId?: string): boolean {
    if (grants.value.some((item) => item.dutyType === dutyType && item.tenantWide)) {
      return true
    }
    if (!departmentId) {
      return false
    }
    return grants.value.some(
      (item) => item.dutyType === dutyType && item.scopeDepartmentId === departmentId,
    )
  }

  function maxSecurityLevelForDuty(dutyType: ArchiveDutyTypeCode): ArchiveSecurityLevelCode | null {
    const policy = securityPolicies.value.find((item) => item.dutyType === dutyType)
    return policy?.maxSecurityLevel ?? null
  }

  function canApproveAccessForVolume(volume: {
    departmentId?: string
    securityLevel?: ArchiveSecurityLevelCode
  }): boolean {
    if (!volume.securityLevel) {
      return false
    }
    const targetOrder = ARCHIVE_SECURITY_LEVEL_ORDER[volume.securityLevel]
    for (const dutyType of ['ARCHIVE_ADMIN', 'TRANSFER_REVIEWER'] as const) {
      if (!hasDutyForDepartment(dutyType, volume.departmentId)) {
        continue
      }
      const maxLevel = maxSecurityLevelForDuty(dutyType)
      if (!maxLevel) {
        continue
      }
      if (targetOrder <= ARCHIVE_SECURITY_LEVEL_ORDER[maxLevel]) {
        return true
      }
    }
    return false
  }

  function canManageRemediationAsCoordinator(volume: { departmentId?: string }): boolean {
    return hasDutyForDepartment('COLLEGE_COORDINATOR', volume.departmentId)
  }

  function filterListDepartmentOptions(
    all: Array<{ value: string; label: string }>,
  ): Array<{ value: string; label: string }> {
    const scopeIds = listScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  const canViewCollegeBoard = computed(() => hasDuty('COLLEGE_COORDINATOR'))
  const canViewArchiveReviewer = computed(
    () => hasDuty('TRANSFER_REVIEWER') || hasDuty('ARCHIVE_ADMIN'),
  )
  const canViewSupervision = computed(() => hasDuty('SUPERVISION_INSPECTOR'))
  const canApproveDestruction = computed(() => hasDuty('DESTRUCTION_APPROVER'))
  const canApproveAccess = computed(() => hasDuty('ARCHIVE_ADMIN') || hasDuty('TRANSFER_REVIEWER'))
  const canReviewTransfer = computed(() => hasDuty('TRANSFER_REVIEWER') || hasDuty('ARCHIVE_ADMIN'))
  const canRejectTransfer = computed(
    () =>
      hasDuty('TRANSFER_REVIEWER') || hasDuty('COLLEGE_COORDINATOR') || hasDuty('ARCHIVE_ADMIN'),
  )
  const canViewStatisticsKpi = computed(
    () => hasDuty('COLLEGE_COORDINATOR') || hasDuty('ARCHIVE_ADMIN'),
  )
  const canManageConfig = computed(() => isTenantAdmin.value)

  async function loadGrants() {
    loading.value = true
    grantsLoadFailed.value = false
    try {
      const [grantList, policyList] = await Promise.all([
        listMyArchiveDutyGrants(),
        listArchiveSecurityPolicy(),
      ])
      grants.value = grantList
      securityPolicies.value = policyList
    } catch (error) {
      showUserError(error)
      grantsLoadFailed.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    grantsLoadFailed,
    grants,
    securityPolicies,
    dutyTypes,
    scopedDepartmentIds,
    listScopedDepartmentIds,
    isTenantAdmin,
    isTenantWideCollegeCoordinator,
    hasDuty,
    hasDutyForDepartment,
    canApproveAccessForVolume,
    canManageRemediationAsCoordinator,
    filterListDepartmentOptions,
    canViewCollegeBoard,
    canViewArchiveReviewer,
    canViewSupervision,
    canApproveDestruction,
    canApproveAccess,
    canReviewTransfer,
    canRejectTransfer,
    canViewStatisticsKpi,
    canManageConfig,
    loadGrants,
  }
}
