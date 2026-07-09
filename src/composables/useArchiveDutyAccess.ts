import type {
  ArchiveDutyGrantResponse,
  ArchiveSecurityPolicyResponse,
} from '@/apis/mark/archive-config'
import { computed, ref } from 'vue'
import {
  ArchiveDutyTypeCode,
  listArchiveSecurityPolicy,
  listMyArchiveDutyGrants,
} from '@/apis/mark/archive-config'
import { ArchiveSecurityLevelCode } from '@/apis/mark/archive-volume'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'

const ARCHIVE_SECURITY_LEVEL_ORDER: Record<ArchiveSecurityLevelCode, number> = {
  [ArchiveSecurityLevelCode.PUBLIC]: 0,
  [ArchiveSecurityLevelCode.INTERNAL]: 1,
  [ArchiveSecurityLevelCode.RESTRICTED]: 2,
  [ArchiveSecurityLevelCode.CONFIDENTIAL]: 3,
}

/**
 * 当前用户归档岗位职责，驱动 archive-volumes 岗位 Tab 可见性与范围过滤。
 */
export function useArchiveDutyAccess() {
  const userStore = useUserStore()
  const loading = ref(false)
  const grantsLoadFailed = ref(false)
  const grants = ref<ArchiveDutyGrantResponse[]>([])
  const securityPolicies = ref<ArchiveSecurityPolicyResponse[]>([])

  const dutyTypes = computed(() => new Set(grants.value.map((item) => item.dutyType)))

  function resolveScopedDepartmentIdsForDutyTypes(types: ArchiveDutyTypeCode[]): string[] {
    const relevant = grants.value.filter((item) => types.includes(item.dutyType))
    if (relevant.some((item) => item.tenantWide)) {
      return []
    }
    return [
      ...new Set(
        relevant
          .map((item) => item.scopeDepartmentId)
          .filter((departmentId): departmentId is string => Boolean(departmentId)),
      ),
    ]
  }

  const scopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes([ArchiveDutyTypeCode.COLLEGE_COORDINATOR]),
  )

  /** 与后端 resolveListDepartmentScope 一致：任一 tenantWide 职责则不限院系，否则汇总全部 scopeDepartmentId */
  const listScopedDepartmentIds = computed(() => {
    if (grants.value.some((item) => item.tenantWide)) {
      const unrestrictedDepartments: string[] = []
      return unrestrictedDepartments
    }
    return [
      ...new Set(
        grants.value
          .map((item) => item.scopeDepartmentId)
          .filter((departmentId): departmentId is string => Boolean(departmentId)),
      ),
    ]
  })

  const isTenantAdmin = userStore.isTenantAdmin

  const isTenantWideCollegeCoordinator = computed(() =>
    grants.value.some(
      (item) =>
        item.dutyType === ArchiveDutyTypeCode.COLLEGE_COORDINATOR && item.tenantWide === true,
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
    for (const dutyType of [
      ArchiveDutyTypeCode.ARCHIVE_ADMIN,
      ArchiveDutyTypeCode.TRANSFER_REVIEWER,
    ]) {
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
    return hasDutyForDepartment(ArchiveDutyTypeCode.COLLEGE_COORDINATOR, volume.departmentId)
  }

  function filterListDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = listScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  const canViewCollegeBoard = computed(() => canViewDepartmentTasks.value)
  const canViewDepartmentTasks = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)
      || hasDuty(ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST),
  )
  const canViewArchiveReviewer = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.TRANSFER_REVIEWER) || hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN),
  )
  const canViewSupervision = computed(() => hasDuty(ArchiveDutyTypeCode.SUPERVISION_INSPECTOR))
  const canApproveDestruction = computed(() => hasDuty(ArchiveDutyTypeCode.DESTRUCTION_APPROVER))
  const canApproveAccess = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN) || hasDuty(ArchiveDutyTypeCode.TRANSFER_REVIEWER),
  )
  const canReviewTransfer = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.TRANSFER_REVIEWER) || hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN),
  )
  const canRejectTransfer = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.TRANSFER_REVIEWER)
      || hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)
      || hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN),
  )
  const canViewStatisticsKpi = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)
      || hasDuty(ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST)
      || hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN),
  )
  const isDepartmentArchivistOnly = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST)
      && !hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR),
  )
  const canRemindArchiveDue = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)
      || hasDuty(ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST),
  )
  const canViewSearchAudit = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)
      || hasDuty(ArchiveDutyTypeCode.SUPERVISION_INSPECTOR)
      || hasDuty(ArchiveDutyTypeCode.TRANSFER_REVIEWER)
      || hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)
      || hasDuty(ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST),
  )

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
    canApproveAccessForVolume,
    canManageRemediationAsCoordinator,
    filterListDepartmentOptions,
    canViewCollegeBoard,
    canViewDepartmentTasks,
    canViewArchiveReviewer,
    canViewSupervision,
    canApproveDestruction,
    canApproveAccess,
    canReviewTransfer,
    canRejectTransfer,
    canViewStatisticsKpi,
    canRemindArchiveDue,
    canViewSearchAudit,
    isDepartmentArchivistOnly,
    loadGrants,
  }
}
