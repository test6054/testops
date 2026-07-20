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
import { canViewArchiveDepartmentQueueFromGrants } from '@/utils/archive-department-queue-access'
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

  /** 销毁清册只按 ARCHIVE_ADMIN / DESTRUCTION_APPROVER 职责解析院系范围。 */
  const destructionLedgerScopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes([
      ArchiveDutyTypeCode.ARCHIVE_ADMIN,
      ArchiveDutyTypeCode.DESTRUCTION_APPROVER,
    ]),
  )

  /** 迎评统计只按 COLLEGE_COORDINATOR / ARCHIVE_ADMIN 职责解析院系范围。 */
  const statisticsScopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes([
      ArchiveDutyTypeCode.COLLEGE_COORDINATOR,
      ArchiveDutyTypeCode.ARCHIVE_ADMIN,
    ]),
  )

  /** 全局查阅台账只按查阅审批职责解析院系范围。 */
  const accessLedgerScopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes([
      ArchiveDutyTypeCode.ARCHIVE_ADMIN,
      ArchiveDutyTypeCode.TRANSFER_REVIEWER,
    ]),
  )

  /** 全局事件审计只按档案治理与督导职责解析院系范围。 */
  const globalAuditScopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes([
      ArchiveDutyTypeCode.ARCHIVE_ADMIN,
      ArchiveDutyTypeCode.SUPERVISION_INSPECTOR,
    ]),
  )

  /** 材料检索留痕只按五类留痕治理职责解析院系范围。 */
  const searchAuditScopedDepartmentIds = computed(() =>
    resolveScopedDepartmentIdsForDutyTypes([
      ArchiveDutyTypeCode.ARCHIVE_ADMIN,
      ArchiveDutyTypeCode.TRANSFER_REVIEWER,
      ArchiveDutyTypeCode.SUPERVISION_INSPECTOR,
      ArchiveDutyTypeCode.COLLEGE_COORDINATOR,
      ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST,
    ]),
  )

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


  function filterListDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = listScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  function filterDestructionLedgerDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = destructionLedgerScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  function filterStatisticsDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = statisticsScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  function filterAccessLedgerDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = accessLedgerScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  function filterGlobalAuditDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = globalAuditScopedDepartmentIds.value
    if (scopeIds.length === 0) {
      return all
    }
    return all.filter((item) => scopeIds.includes(item.value))
  }

  function filterSearchAuditDepartmentOptions(
    all: Array<{ value: string, label: string }>,
  ): Array<{ value: string, label: string }> {
    const scopeIds = searchAuditScopedDepartmentIds.value
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
  const canViewDestructionLedger = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)
      || hasDuty(ArchiveDutyTypeCode.DESTRUCTION_APPROVER),
  )
  const canApproveAccess = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN) || hasDuty(ArchiveDutyTypeCode.TRANSFER_REVIEWER),
  )
  const canViewAccessLedger = computed(() => canApproveAccess.value)
  const canViewGlobalAudit = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)
      || hasDuty(ArchiveDutyTypeCode.SUPERVISION_INSPECTOR),
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

  function canApproveDestructionForDepartment(departmentId?: string): boolean {
    return hasDutyForDepartment(ArchiveDutyTypeCode.DESTRUCTION_APPROVER, departmentId)
  }

  function canReviewTransferForDepartment(departmentId?: string): boolean {
    return (
      hasDutyForDepartment(ArchiveDutyTypeCode.TRANSFER_REVIEWER, departmentId)
      || hasDutyForDepartment(ArchiveDutyTypeCode.ARCHIVE_ADMIN, departmentId)
    )
  }

  function canRejectTransferForDepartment(departmentId?: string): boolean {
    return (
      hasDutyForDepartment(ArchiveDutyTypeCode.TRANSFER_REVIEWER, departmentId)
      || hasDutyForDepartment(ArchiveDutyTypeCode.COLLEGE_COORDINATOR, departmentId)
      || hasDutyForDepartment(ArchiveDutyTypeCode.ARCHIVE_ADMIN, departmentId)
    )
  }
  const canViewStatisticsKpi = computed(
    () =>
      hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)
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
  const canViewArchiveDepartmentQueue = computed(() =>
    canViewArchiveDepartmentQueueFromGrants(grants.value),
  )

  async function loadGrants() {
    loading.value = true
    grantsLoadFailed.value = false
    try {
      // 职责授权：任意登录教师可读；密级策略只读供岗位门禁，与「归档配置」维护页解耦
      grants.value = await listMyArchiveDutyGrants()
      try {
        securityPolicies.value = await listArchiveSecurityPolicy()
      } catch (policyError) {
        securityPolicies.value = []
        showUserError(policyError, '加载归档密级策略失败')
      }
    } catch (error) {
      showUserError(error, '加载档案职责授权失败')
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
    statisticsScopedDepartmentIds,
    destructionLedgerScopedDepartmentIds,
    accessLedgerScopedDepartmentIds,
    globalAuditScopedDepartmentIds,
    searchAuditScopedDepartmentIds,
    isTenantAdmin,
    isTenantWideCollegeCoordinator,
    hasDuty,
    hasDutyForDepartment,
    canApproveAccessForVolume,
    filterListDepartmentOptions,
    filterStatisticsDepartmentOptions,
    filterDestructionLedgerDepartmentOptions,
    filterAccessLedgerDepartmentOptions,
    filterGlobalAuditDepartmentOptions,
    filterSearchAuditDepartmentOptions,
    canViewCollegeBoard,
    canViewDepartmentTasks,
    canViewArchiveReviewer,
    canViewSupervision,
    canApproveDestruction,
    canViewDestructionLedger,
    canApproveDestructionForDepartment,
    canApproveAccess,
    canViewAccessLedger,
    canViewGlobalAudit,
    canReviewTransfer,
    canReviewTransferForDepartment,
    canRejectTransfer,
    canRejectTransferForDepartment,
    canViewStatisticsKpi,
    canRemindArchiveDue,
    canViewSearchAudit,
    canViewArchiveDepartmentQueue,
    isDepartmentArchivistOnly,
    loadGrants,
  }
}
