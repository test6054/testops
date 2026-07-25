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
import type { SignalMetric } from '@/types/workbench'
import type {MarkingSessionFilterModel, MarkingSessionListPhase} from '@/utils/marking-session-list-contract';
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
import { MarkingSessionPhaseCode } from '@/types/enums/marking-session-phase-enum'
import { showUserError } from '@/utils/error-handler'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'
import {
  applySessionFilterToListQuery,
  
  
  parseSessionFilterModel,
  resolveSessionPageAfterReload
} from '@/utils/marking-session-list-contract'
import { resolveSessionCreateWorkflowSteps } from '@/utils/workflow-readiness/session-create-readiness'

export type MarkingOrgSessionPhase = MarkingSessionListPhase
export type MarkingOrgSessionFilterModel = MarkingSessionFilterModel

const DEFAULT_SESSION_PAGE_SIZE = 10

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
  const organizationLoadFailed = ref(false)
  const sessionsLoadFailed = ref(false)
  const summaryLoadFailed = ref(false)
  const policiesLoadFailed = ref(false)
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

  let organizationLoadGeneration = 0
  let sessionsLoadGeneration = 0
  let summaryLoadGeneration = 0
  let readinessLoadGeneration = 0
  let policiesLoadGeneration = 0

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
    if (canManageOrganization.value) {
      return true
    }
    void message.warning('仅考试主考老师可管理试评 / 正评会话')
    return false
  }

  /** MVR-398：关闭会话打开闸；关考后主考仍可收口 */
  function guardCloseMarkingSessionAction(): boolean {
    if (canCloseMarkingSessions.value) {
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
    organizationLoadFailed.value = false
    sessionsLoadFailed.value = false
    summaryLoadFailed.value = false
    policiesLoadFailed.value = false
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

  function bumpAllLoadGenerations(): void {
    organizationLoadGeneration += 1
    sessionsLoadGeneration += 1
    summaryLoadGeneration += 1
    readinessLoadGeneration += 1
    policiesLoadGeneration += 1
  }

  function isOrganizationRequestCurrent(generation: number, expectedOrgId: string): boolean {
    return generation === organizationLoadGeneration && organizationId.value === expectedOrgId
  }

  function isSessionsRequestCurrent(generation: number, expectedOrgId: string): boolean {
    return generation === sessionsLoadGeneration && organizationId.value === expectedOrgId
  }

  function isSummaryRequestCurrent(generation: number, expectedOrgId: string): boolean {
    return generation === summaryLoadGeneration && organizationId.value === expectedOrgId
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
    applySessionFilterToListQuery(query, phase, sessionFilterModel.value)
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
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      bumpAllLoadGenerations()
      resetSessionState()
      return false
    }
    const generation = ++organizationLoadGeneration
    try {
      const nextOrganization = await getOrganizationById({ organizationId: expectedOrgId })
      if (!isOrganizationRequestCurrent(generation, expectedOrgId)) {
        return false
      }
      if (!(await alignWorkspaceRouteExamId(nextOrganization))) {
        return false
      }
      if (!isOrganizationRequestCurrent(generation, expectedOrgId)) {
        return false
      }
      organization.value = nextOrganization
      const nextExamDetail = await getExamDetail(nextOrganization.examId)
      if (!isOrganizationRequestCurrent(generation, expectedOrgId)) {
        return false
      }
      examDetail.value = nextExamDetail
      organizationLoadFailed.value = false
      return true
    } catch (error) {
      if (!isOrganizationRequestCurrent(generation, expectedOrgId)) {
        return false
      }
      organizationLoadFailed.value = true
      if (!organization.value || organization.value.id !== expectedOrgId) {
        organization.value = null
        examDetail.value = null
      }
      showUserError(error, '阅卷组织加载失败')
      return false
    }
  }

  async function loadTrialSessions(
    pageNum = sessionPagination.value.current,
    generation = ++sessionsLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (isSessionsRequestCurrent(generation, expectedOrgId)) {
        trialSessions.value = []
        sessionPagination.value.total = 0
        sessionsLoadFailed.value = false
      }
      return
    }
    try {
      const page = await pageTrialSessions(buildListQuery(pageNum))
      if (!isSessionsRequestCurrent(generation, expectedOrgId)) {
        return
      }
      const resolvedPageNum = resolveSessionPageAfterReload(
        page.pageNum ?? pageNum,
        page.pageSize ?? sessionPagination.value.pageSize,
        page.total ?? 0,
      )
      if (resolvedPageNum !== pageNum) {
        await loadTrialSessions(resolvedPageNum, generation, expectedOrgId)
        return
      }
      trialSessions.value = page.list
      sessionPagination.value = {
        current: resolvedPageNum,
        pageSize: page.pageSize ?? sessionPagination.value.pageSize,
        total: page.total ?? 0,
      }
      sessionsLoadFailed.value = false
    } catch (error) {
      if (!isSessionsRequestCurrent(generation, expectedOrgId)) {
        return
      }
      sessionsLoadFailed.value = true
      showUserError(error, '试评会话列表加载失败')
    }
  }

  async function loadFormalSessions(
    pageNum = sessionPagination.value.current,
    generation = ++sessionsLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (isSessionsRequestCurrent(generation, expectedOrgId)) {
        formalSessions.value = []
        sessionPagination.value.total = 0
        sessionsLoadFailed.value = false
      }
      return
    }
    try {
      const page = await pageFormalSessions(buildListQuery(pageNum))
      if (!isSessionsRequestCurrent(generation, expectedOrgId)) {
        return
      }
      const resolvedPageNum = resolveSessionPageAfterReload(
        page.pageNum ?? pageNum,
        page.pageSize ?? sessionPagination.value.pageSize,
        page.total ?? 0,
      )
      if (resolvedPageNum !== pageNum) {
        await loadFormalSessions(resolvedPageNum, generation, expectedOrgId)
        return
      }
      formalSessions.value = page.list
      sessionPagination.value = {
        current: resolvedPageNum,
        pageSize: page.pageSize ?? sessionPagination.value.pageSize,
        total: page.total ?? 0,
      }
      sessionsLoadFailed.value = false
    } catch (error) {
      if (!isSessionsRequestCurrent(generation, expectedOrgId)) {
        return
      }
      sessionsLoadFailed.value = true
      showUserError(error, '正评会话列表加载失败')
    }
  }

  async function loadTrialSummary(
    generation = ++summaryLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (isSummaryRequestCurrent(generation, expectedOrgId)) {
        trialSummary.value = null
        summaryLoadFailed.value = false
      }
      return
    }
    try {
      const summary = await getTrialSessionWorkbenchSummary(buildSummaryQuery())
      if (!isSummaryRequestCurrent(generation, expectedOrgId)) {
        return
      }
      trialSummary.value = summary
      summaryLoadFailed.value = false
    } catch (error) {
      if (!isSummaryRequestCurrent(generation, expectedOrgId)) {
        return
      }
      summaryLoadFailed.value = true
      showUserError(error, '试评会话汇总加载失败')
    }
  }

  async function loadFormalSummary(
    generation = ++summaryLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (isSummaryRequestCurrent(generation, expectedOrgId)) {
        formalSummary.value = null
        summaryLoadFailed.value = false
      }
      return
    }
    try {
      const summary = await getFormalSessionWorkbenchSummary(buildSummaryQuery())
      if (!isSummaryRequestCurrent(generation, expectedOrgId)) {
        return
      }
      formalSummary.value = summary
      summaryLoadFailed.value = false
    } catch (error) {
      if (!isSummaryRequestCurrent(generation, expectedOrgId)) {
        return
      }
      summaryLoadFailed.value = true
      showUserError(error, '正评会话汇总加载失败')
    }
  }

  async function loadPhaseSessions(
    pageNum = sessionPagination.value.current,
    generation = ++sessionsLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (phase === 'trial') {
      await loadTrialSessions(pageNum, generation, expectedOrgId)
      return
    }
    await loadFormalSessions(pageNum, generation, expectedOrgId)
  }

  async function loadSessionCreateReadiness(
    generation = ++readinessLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (generation === readinessLoadGeneration && organizationId.value === expectedOrgId) {
        sessionCreateReadiness.value = null
        sessionCreateReadinessLoadFailed.value = false
      }
      return
    }
    try {
      const readiness = await getSessionCreateReadiness({
        organizationId: expectedOrgId,
        markingPhase: sessionMarkingPhase,
      })
      if (generation !== readinessLoadGeneration || organizationId.value !== expectedOrgId) {
        return
      }
      sessionCreateReadiness.value = readiness
      sessionCreateReadinessLoadFailed.value = false
    } catch (error) {
      if (generation !== readinessLoadGeneration || organizationId.value !== expectedOrgId) {
        return
      }
      sessionCreateReadinessLoadFailed.value = true
      showUserError(error, phase === 'trial' ? '试评创建条件加载失败' : '正评创建条件加载失败')
    }
  }

  async function loadPhaseSummary(
    generation = ++summaryLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (phase === 'trial') {
      await loadTrialSummary(generation, expectedOrgId)
      return
    }
    await loadFormalSummary(generation, expectedOrgId)
  }

  async function loadMarkingPolicies(
    generation = ++policiesLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (generation === policiesLoadGeneration && organizationId.value === expectedOrgId) {
        allocationPolicies.value = []
        policiesLoadFailed.value = false
      }
      return
    }
    try {
      const response = await listMarkingPolicies({ organizationId: expectedOrgId })
      if (generation !== policiesLoadGeneration || organizationId.value !== expectedOrgId) {
        return
      }
      allocationPolicies.value = response.allocationPolicies ?? []
      policiesLoadFailed.value = false
    } catch (error) {
      if (generation !== policiesLoadGeneration || organizationId.value !== expectedOrgId) {
        return
      }
      policiesLoadFailed.value = true
      showUserError(error, '分配策略加载失败')
    }
  }

  async function reloadSessions(): Promise<void> {
    const expectedOrgId = organizationId.value
    if (!expectedOrgId || !organization.value) {
      return
    }
    const sessionsGeneration = ++sessionsLoadGeneration
    const summaryGeneration = ++summaryLoadGeneration
    sessionsLoading.value = true
    try {
      await Promise.all([
        loadPhaseSessions(sessionPagination.value.current, sessionsGeneration, expectedOrgId),
        loadPhaseSummary(summaryGeneration, expectedOrgId),
      ])
    } finally {
      if (sessionsGeneration === sessionsLoadGeneration) {
        sessionsLoading.value = false
      }
    }
  }

  async function reloadAll(): Promise<void> {
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      bumpAllLoadGenerations()
      resetSessionState()
      return
    }
    if (organization.value && organization.value.id !== expectedOrgId) {
      bumpAllLoadGenerations()
      resetSessionState()
    }
    initialLoading.value = true
    sessionsLoading.value = true
    try {
      const loaded = await loadOrganization()
      if (!loaded || organizationId.value !== expectedOrgId) {
        return
      }
      const policiesGeneration = ++policiesLoadGeneration
      const sessionsGeneration = ++sessionsLoadGeneration
      const summaryGeneration = ++summaryLoadGeneration
      const readinessGeneration = ++readinessLoadGeneration
      await loadMarkingPolicies(policiesGeneration, expectedOrgId)
      if (organizationId.value !== expectedOrgId) {
        return
      }
      sessionPagination.value.current = 1
      await Promise.all([
        loadPhaseSessions(1, sessionsGeneration, expectedOrgId),
        loadPhaseSummary(summaryGeneration, expectedOrgId),
        loadSessionCreateReadiness(readinessGeneration, expectedOrgId),
      ])
    } finally {
      if (organizationId.value === expectedOrgId) {
        initialLoading.value = false
        sessionsLoading.value = false
      }
    }
  }

  function applySessionFilter(model: Record<string, unknown>): void {
    sessionFilterModel.value = parseSessionFilterModel(phase, model)
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
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      return
    }
    sessionPagination.value.current = page.current
    sessionPagination.value.pageSize = page.pageSize
    const generation = ++sessionsLoadGeneration
    sessionsLoading.value = true
    void loadPhaseSessions(page.current, generation, expectedOrgId).finally(() => {
      if (generation === sessionsLoadGeneration) {
        sessionsLoading.value = false
      }
    })
  }

  const signalMetrics = computed<SignalMetric[]>(() => {
    if (summaryLoadFailed.value) {
      if (phase === 'trial') {
        return [
          { key: 'trial-total', label: '试评会话', value: '—', tone: 'gray' },
          { key: 'trial-created', label: '待启动', value: '—', tone: 'gray' },
          { key: 'trial-pending-calibrate', label: '待校准', value: '—', tone: 'gray' },
          { key: 'trial-calibrated', label: '已校准', value: '—', tone: 'gray' },
          { key: 'trial-closed', label: '已关闭', value: '—', tone: 'gray' },
        ]
      }
      return [
        { key: 'formal-total', label: '正评会话', value: '—', tone: 'gray' },
        { key: 'formal-active', label: '进行中', value: '—', tone: 'gray' },
        { key: 'formal-created', label: '待启动', value: '—', tone: 'gray' },
        { key: 'formal-completed', label: '已完成', value: '—', tone: 'gray' },
      ]
    }
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
          tone: 'gray',
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
        tone: 'gray',
      },
    ]
  })

  async function onTrialSessionsChanged(): Promise<void> {
    if (phase === 'trial') {
      try {
        await Promise.all([reloadSessions(), loadSessionCreateReadiness()])
      } catch (error) {
        showUserError(error, '会话已变更，但列表刷新失败')
      }
    }
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '会话已变更，但阶段快照刷新失败')
    }
  }

  async function onFormalSessionsChanged(): Promise<void> {
    if (phase === 'formal') {
      try {
        await Promise.all([reloadSessions(), loadSessionCreateReadiness()])
      } catch (error) {
        showUserError(error, '会话已变更，但列表刷新失败')
      }
    }
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '会话已变更，但阶段快照刷新失败')
    }
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
    organizationLoadFailed,
    sessionsLoadFailed,
    summaryLoadFailed,
    policiesLoadFailed,
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
