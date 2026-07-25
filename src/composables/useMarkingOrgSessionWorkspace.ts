import type { ExamDetailResponse } from '@/apis/mark/exam'
import type {
  AllocationPolicyResponse,
  AllocationUnitCode,
  FormalSessionResponse,
  FormalSessionWorkbenchSummaryResponse,
  MarkingOrganizationResponse,
  SessionCreateReadinessResponse,
  SessionListQueryRequest,
  SessionSummaryQueryRequest,
  TrialSessionResponse,
  TrialSessionWorkbenchSummaryResponse,
} from '@/apis/mark/marking-organization'
import type { FormalSessionStatusCode } from '@/types/enums/formal-session-status-enum'
import type { TrialSessionStatusCode } from '@/types/enums/trial-session-status-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import {
  getFormalSessionWorkbenchSummary,
  getOrganizationById,
  getSessionCreateReadiness,
  getTrialSessionWorkbenchSummary,
  listMarkingPolicies,
  pageFormalSessions,
  pageTrialSessions,
  requireMarkingOrganizationId,
} from '@/apis/mark/marking-organization'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { ALL_FORMAL_SESSION_STATUS_CODES } from '@/types/enums/formal-session-status-enum'
import { MarkingSessionPhaseCode } from '@/types/enums/marking-session-phase-enum'
import { ALL_TRIAL_SESSION_STATUS_CODES } from '@/types/enums/trial-session-status-enum'
import { showUserError } from '@/utils/error-handler'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'
import { resolveSessionCreateWorkflowSteps } from '@/utils/workflow-readiness/session-create-readiness'

export type MarkingOrgSessionPhase = 'trial' | 'formal'

export interface MarkingOrgSessionFilterModel {
  keyword: string
  status?: TrialSessionStatusCode | FormalSessionStatusCode
  groupId?: string
}

const DEFAULT_SESSION_PAGE_SIZE = 10

function resolveSessionPageAfterReload(
  requestedPageNum: number,
  pageSize: number,
  total: number,
): number {
  if (total <= 0) {
    return 1
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (requestedPageNum > totalPages) {
    return totalPages
  }
  return requestedPageNum
}

/**
 * 试评 / 正评独立会话页的共享加载与权限上下文。
 * 列表走服务端分页与筛选；SignalBand 走独立汇总接口。
 */
export function useMarkingOrgSessionWorkspace(phase: MarkingOrgSessionPhase) {
  const route = useRoute()
  const router = useRouter()
  const { refreshSnapshot } = useWorkspaceExamId()

  const organizationId = computed(() => String(route.params.organizationId || ''))
  const routeExamId = computed(() => String(route.params.examId || ''))
  const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

  const organization = ref<MarkingOrganizationResponse | null>(null)
  const examDetail = ref<ExamDetailResponse | null>(null)
  const trialSessions = ref<TrialSessionResponse[]>([])
  const formalSessions = ref<FormalSessionResponse[]>([])
  const trialSummary = ref<TrialSessionWorkbenchSummaryResponse | null>(null)
  const formalSummary = ref<FormalSessionWorkbenchSummaryResponse | null>(null)
  const allocationPolicies = ref<AllocationPolicyResponse[]>([])
  const sessionCreateReadiness = ref<SessionCreateReadinessResponse | null>(null)
  const sessionCreateReadinessLoadFailed = ref(false)
  const initialLoading = ref(false)
  const sessionsLoading = ref(false)
  const sessionPagination = ref({
    current: 1,
    pageSize: DEFAULT_SESSION_PAGE_SIZE,
    total: 0,
  })
  const sessionFilterModel = ref<MarkingOrgSessionFilterModel>({
    keyword: '',
    status: undefined,
    groupId: undefined,
  })

  const resolveRoute
    = phase === 'trial'
      ? resolveMarkingOrganizationTrialSessionsRoute
      : resolveMarkingOrganizationFormalSessionsRoute

  const sessionMarkingPhase
    = phase === 'trial' ? MarkingSessionPhaseCode.TRIAL : MarkingSessionPhaseCode.FORMAL

  const groupOptions = computed(() =>
    (organization.value?.groups ?? []).map((group) => ({
      value: group.id,
      label: group.groupName,
      // MVR-402：供会话 workbench 启动闸叠题组状态（CLOSED/DRAFT 不可启动）
      groupStatus: group.groupStatus,
    })),
  )

  const groupAllocationUnitMap = computed(() => {
    const map: Record<string, AllocationUnitCode> = {}
    const defaultAllocationUnit = allocationPolicies.value.find(
      (policy) => policy.groupId == null,
    )?.allocationUnit
    for (const group of organization.value?.groups ?? []) {
      const groupPolicy = allocationPolicies.value.find((policy) => policy.groupId === group.id)
      const allocationUnit = groupPolicy?.allocationUnit ?? defaultAllocationUnit
      if (allocationUnit) {
        map[group.id] = allocationUnit
      }
    }
    return map
  })

  const groupAllocationPolicyMap = computed(() => {
    const map: Record<string, AllocationPolicyResponse> = {}
    const defaultPolicy = allocationPolicies.value.find((policy) => policy.groupId == null)
    for (const group of organization.value?.groups ?? []) {
      const groupPolicy = allocationPolicies.value.find((policy) => policy.groupId === group.id)
      const policy = groupPolicy ?? defaultPolicy
      if (policy) {
        map[group.id] = policy
      }
    }
    return map
  })

  const groupHasAllocationPolicyMap = computed(() => {
    const map: Record<string, boolean> = {}
    for (const group of organization.value?.groups ?? []) {
      map[group.id] = Boolean(groupAllocationUnitMap.value[group.id])
    }
    return map
  })

  const groupCreateReadinessMap = computed(() => {
    const map: Record<string, SessionCreateReadinessResponse['groups'][number]> = {}
    for (const group of sessionCreateReadiness.value?.groups ?? []) {
      map[group.groupId] = group
    }
    return map
  })

  /**
   * MVR-396：可建会话题组仅认 BE groups[].canCreate；
   * readiness 未下发或无题组时默认空列表，禁止回退展示全部题组假可建。
   */
  const creatableGroupOptions = computed(() => {
    const readinessGroups = sessionCreateReadiness.value?.groups
    if (!readinessGroups?.length) {
      return []
    }
    const creatableGroupIds = new Set(
      readinessGroups.filter((group) => group.canCreate).map((group) => group.groupId),
    )
    return groupOptions.value.filter((option) => creatableGroupIds.has(option.value))
  })

  const canCreateSession = computed(() => sessionCreateReadiness.value?.canCreate === true)

  const sessionCreateReadinessLoaded = computed(() => sessionCreateReadiness.value !== null)

  const sessionCreateWorkflow = computed(() =>
    resolveSessionCreateWorkflowSteps({
      readiness: sessionCreateReadiness.value,
      phase,
      examId: sessionCreateReadiness.value?.examId ?? organization.value?.examId,
      organizationId: organizationId.value || sessionCreateReadiness.value?.organizationId,
    }),
  )

  const examCreateUserId = computed(
    () => examDetail.value?.createUser ?? organization.value?.examCreateUserId,
  )
  const { canManageExamOwner: canManageOrganization } = useMarkingOrgPermission(
    examCreateUserId,
    organization,
  )

  /**
   * MVR-398：关闭试评/正评仅认 BE canCloseMarkingSessions===true（主考，不叠 ACTIVE）。
   */
  const canCloseMarkingSessions = computed(
    () => organization.value?.canCloseMarkingSessions === true,
  )

  function guardOrganizationOwnerAction(): boolean {
    // MVR-953：仅认 canManageOrganization===true
    if (canManageOrganization.value === true) {
      return true
    }
    void message.warning('仅考试主考老师可管理试评 / 正评会话')
    return false
  }

  /** MVR-398：关闭会话打开闸；关考后主考仍可收口 */
  function guardCloseMarkingSessionAction(): boolean {
    // MVR-953：仅认 canCloseMarkingSessions===true
    if (canCloseMarkingSessions.value === true) {
      return true
    }
    void message.warning('仅考试主考老师可关闭试评 / 正评会话')
    return false
  }

  function resetSessionState(): void {
    organization.value = null
    examDetail.value = null
    trialSessions.value = []
    formalSessions.value = []
    trialSummary.value = null
    formalSummary.value = null
    allocationPolicies.value = []
    sessionCreateReadiness.value = null
    sessionCreateReadinessLoadFailed.value = false
    sessionPagination.value = {
      current: 1,
      pageSize: DEFAULT_SESSION_PAGE_SIZE,
      total: 0,
    }
    sessionFilterModel.value = {
      keyword: '',
      status: undefined,
      groupId: undefined,
    }
  }

  function buildSummaryQuery(): SessionSummaryQueryRequest {
    const query: SessionSummaryQueryRequest = {
      organizationId: organizationId.value,
    }
    if (sessionFilterModel.value.groupId) {
      query.groupId = sessionFilterModel.value.groupId
    }
    return query
  }

  function buildListQuery(pageNum: number): SessionListQueryRequest {
    const query: SessionListQueryRequest = {
      organizationId: organizationId.value,
      pageNum,
      pageSize: sessionPagination.value.pageSize,
    }
    const keyword = sessionFilterModel.value.keyword.trim()
    if (keyword) {
      query.keyword = keyword
    }
    if (sessionFilterModel.value.groupId) {
      query.groupId = sessionFilterModel.value.groupId
    }
    if (phase === 'trial' && sessionFilterModel.value.status) {
      for (const code of ALL_TRIAL_SESSION_STATUS_CODES) {
        if (code === sessionFilterModel.value.status) {
          query.trialSessionStatus = code
          break
        }
      }
    }
    if (phase === 'formal' && sessionFilterModel.value.status) {
      for (const code of ALL_FORMAL_SESSION_STATUS_CODES) {
        if (code === sessionFilterModel.value.status) {
          query.formalSessionStatus = code
          break
        }
      }
    }
    return query
  }

  async function alignWorkspaceRouteExamId(
    nextOrganization: MarkingOrganizationResponse,
  ): Promise<boolean> {
    if (!nextOrganization.examId) {
      return true
    }
    if (isExamWorkspaceRoute.value && routeExamId.value === nextOrganization.examId) {
      return true
    }
    await router.replace(
      resolveRoute(requireMarkingOrganizationId(nextOrganization), nextOrganization.examId),
    )
    return false
  }

  async function loadOrganization(): Promise<boolean> {
    if (!organizationId.value) {
      resetSessionState()
      return false
    }
    try {
      const nextOrganization = await getOrganizationById({ organizationId: organizationId.value })
      if (!(await alignWorkspaceRouteExamId(nextOrganization))) {
        return false
      }
      organization.value = nextOrganization
      examDetail.value = await getExamDetail(nextOrganization.examId)
      return true
    } catch (error) {
      resetSessionState()
      showUserError(error, '阅卷组织加载失败')
      return false
    }
  }

  async function loadTrialSessions(pageNum = sessionPagination.value.current): Promise<void> {
    if (!organizationId.value) {
      trialSessions.value = []
      sessionPagination.value.total = 0
      return
    }
    try {
      const page = await pageTrialSessions(buildListQuery(pageNum))
      const resolvedPageNum = resolveSessionPageAfterReload(
        page.pageNum ?? pageNum,
        page.pageSize ?? sessionPagination.value.pageSize,
        page.total ?? 0,
      )
      if (resolvedPageNum !== pageNum) {
        await loadTrialSessions(resolvedPageNum)
        return
      }
      trialSessions.value = page.list
      sessionPagination.value = {
        current: resolvedPageNum,
        pageSize: page.pageSize ?? sessionPagination.value.pageSize,
        total: page.total ?? 0,
      }
    } catch (error) {
      trialSessions.value = []
      sessionPagination.value.total = 0
      showUserError(error, '试评会话列表加载失败')
    }
  }

  async function loadFormalSessions(pageNum = sessionPagination.value.current): Promise<void> {
    if (!organizationId.value) {
      formalSessions.value = []
      sessionPagination.value.total = 0
      return
    }
    try {
      const page = await pageFormalSessions(buildListQuery(pageNum))
      const resolvedPageNum = resolveSessionPageAfterReload(
        page.pageNum ?? pageNum,
        page.pageSize ?? sessionPagination.value.pageSize,
        page.total ?? 0,
      )
      if (resolvedPageNum !== pageNum) {
        await loadFormalSessions(resolvedPageNum)
        return
      }
      formalSessions.value = page.list
      sessionPagination.value = {
        current: resolvedPageNum,
        pageSize: page.pageSize ?? sessionPagination.value.pageSize,
        total: page.total ?? 0,
      }
    } catch (error) {
      formalSessions.value = []
      sessionPagination.value.total = 0
      showUserError(error, '正评会话列表加载失败')
    }
  }

  async function loadTrialSummary(): Promise<void> {
    if (!organizationId.value) {
      trialSummary.value = null
      return
    }
    try {
      trialSummary.value = await getTrialSessionWorkbenchSummary(buildSummaryQuery())
    } catch (error) {
      trialSummary.value = null
      showUserError(error, '试评会话汇总加载失败')
    }
  }

  async function loadFormalSummary(): Promise<void> {
    if (!organizationId.value) {
      formalSummary.value = null
      return
    }
    try {
      formalSummary.value = await getFormalSessionWorkbenchSummary(buildSummaryQuery())
    } catch (error) {
      formalSummary.value = null
      showUserError(error, '正评会话汇总加载失败')
    }
  }

  async function loadPhaseSessions(pageNum = sessionPagination.value.current): Promise<void> {
    if (phase === 'trial') {
      await loadTrialSessions(pageNum)
      return
    }
    await loadFormalSessions(pageNum)
  }

  async function loadSessionCreateReadiness(): Promise<void> {
    if (!organizationId.value) {
      sessionCreateReadiness.value = null
      sessionCreateReadinessLoadFailed.value = false
      return
    }
    sessionCreateReadinessLoadFailed.value = false
    try {
      sessionCreateReadiness.value = await getSessionCreateReadiness({
        organizationId: organizationId.value,
        markingPhase: sessionMarkingPhase,
      })
    } catch (error) {
      sessionCreateReadiness.value = null
      sessionCreateReadinessLoadFailed.value = true
      showUserError(error, phase === 'trial' ? '试评创建条件加载失败' : '正评创建条件加载失败')
    }
  }

  async function loadPhaseSummary(): Promise<void> {
    if (phase === 'trial') {
      await loadTrialSummary()
      return
    }
    await loadFormalSummary()
  }

  async function loadMarkingPolicies(): Promise<void> {
    if (!organizationId.value) {
      allocationPolicies.value = []
      return
    }
    try {
      const response = await listMarkingPolicies({ organizationId: organizationId.value })
      allocationPolicies.value = response.allocationPolicies ?? []
    } catch (error) {
      allocationPolicies.value = []
      showUserError(error, '分配策略加载失败')
    }
  }

  async function reloadSessions(): Promise<void> {
    if (!organizationId.value || !organization.value) {
      return
    }
    sessionsLoading.value = true
    try {
      await Promise.all([loadPhaseSessions(), loadPhaseSummary()])
    } finally {
      sessionsLoading.value = false
    }
  }

  async function reloadAll(): Promise<void> {
    if (!organizationId.value) {
      resetSessionState()
      return
    }
    initialLoading.value = true
    sessionsLoading.value = true
    try {
      const loaded = await loadOrganization()
      if (!loaded) {
        return
      }
      await loadMarkingPolicies()
      sessionPagination.value.current = 1
      await Promise.all([loadPhaseSessions(1), loadPhaseSummary(), loadSessionCreateReadiness()])
    } finally {
      initialLoading.value = false
      sessionsLoading.value = false
    }
  }

  function applySessionFilter(model: Record<string, unknown>): void {
    let status: TrialSessionStatusCode | FormalSessionStatusCode | undefined
    const rawStatus = model.status
    if (typeof rawStatus === 'string' && rawStatus) {
      if (phase === 'trial') {
        for (const code of ALL_TRIAL_SESSION_STATUS_CODES) {
          if (code === rawStatus) {
            status = code
            break
          }
        }
      } else {
        for (const code of ALL_FORMAL_SESSION_STATUS_CODES) {
          if (code === rawStatus) {
            status = code
            break
          }
        }
      }
    }
    sessionFilterModel.value = {
      keyword: String(model.keyword ?? '').trim(),
      status,
      groupId: model.groupId ? String(model.groupId) : undefined,
    }
    sessionPagination.value.current = 1
    void reloadSessions()
  }

  function resetSessionFilter(): void {
    sessionFilterModel.value = {
      keyword: '',
      status: undefined,
      groupId: undefined,
    }
    sessionPagination.value.current = 1
    void reloadSessions()
  }

  function handleSessionPageChange(page: { current: number, pageSize: number }): void {
    sessionPagination.value.current = page.current
    sessionPagination.value.pageSize = page.pageSize
    sessionsLoading.value = true
    void loadPhaseSessions(page.current).finally(() => {
      sessionsLoading.value = false
    })
  }

  const signalMetrics = computed<SignalMetric[]>(() => {
    if (phase === 'trial') {
      const summary = trialSummary.value
      if (!summary) {
        return []
      }
      return [
        {
          key: 'trial-total',
          label: '试评会话',
          value: summary.totalCount,
          tone: summary.totalCount > 0 ? 'blue' : 'gray',
        },
        {
          key: 'trial-created',
          label: '待启动',
          value: summary.createdCount,
          tone: summary.createdCount > 0 ? 'orange' : 'gray',
        },
        {
          key: 'trial-pending-calibrate',
          label: '待校准',
          value: summary.pendingCalibrateCount,
          tone: summary.pendingCalibrateCount > 0 ? 'orange' : 'gray',
        },
        {
          key: 'trial-calibrated',
          label: '已校准',
          value: summary.calibratedCount,
          tone: summary.calibratedCount > 0 ? 'green' : 'gray',
        },
        {
          key: 'trial-closed',
          label: '已关闭',
          value: summary.closedCount,
          tone: summary.closedCount > 0 ? 'gray' : 'gray',
        },
      ]
    }

    const summary = formalSummary.value
    if (!summary) {
      return []
    }
    return [
      {
        key: 'formal-total',
        label: '正评会话',
        value: summary.totalCount,
        tone: summary.totalCount > 0 ? 'blue' : 'gray',
      },
      {
        key: 'formal-active',
        label: '进行中',
        value: summary.activeCount,
        tone: summary.activeCount > 0 ? 'green' : 'gray',
      },
      {
        key: 'formal-created',
        label: '待启动',
        value: summary.createdCount,
        tone: summary.createdCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'formal-completed',
        label: '已完成',
        value: summary.completedCount,
        tone: summary.completedCount > 0 ? 'gray' : 'gray',
      },
    ]
  })

  async function onTrialSessionsChanged(): Promise<void> {
    if (phase === 'trial') {
      await Promise.all([reloadSessions(), loadSessionCreateReadiness()])
    }
    await refreshSnapshot()
  }

  async function onFormalSessionsChanged(): Promise<void> {
    if (phase === 'formal') {
      await Promise.all([reloadSessions(), loadSessionCreateReadiness()])
    }
    await refreshSnapshot()
  }

  watch(
    () => ({ organizationId: organizationId.value, routeExamId: routeExamId.value }),
    () => {
      void reloadAll()
    },
    { immediate: true },
  )

  return {
    organizationId,
    isExamWorkspaceRoute,
    organization,
    trialSessions,
    formalSessions,
    initialLoading,
    sessionsLoading,
    sessionPagination,
    sessionFilterModel,
    groupOptions,
    creatableGroupOptions,
    groupAllocationUnitMap,
    groupAllocationPolicyMap,
    groupHasAllocationPolicyMap,
    groupCreateReadinessMap,
    canCreateSession,
    sessionCreateReadinessLoaded,
    sessionCreateReadinessLoadFailed,
    sessionCreateWorkflow,
    sessionCreateReadiness,
    canManageOrganization,
    canCloseMarkingSessions,
    signalMetrics,
    guardOrganizationOwnerAction,
    guardCloseMarkingSessionAction,
    reloadAll,
    reloadSessions,
    applySessionFilter,
    resetSessionFilter,
    handleSessionPageChange,
    onTrialSessionsChanged,
    onFormalSessionsChanged,
  }
}
