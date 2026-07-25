import type { ComputedRef } from 'vue'
import type {
  FormalSessionResponse,
  SessionListQueryRequest,
  TrialSessionResponse,
} from '@/apis/mark/marking-organization'
import type {MarkingSessionFilterModel, MarkingSessionListPhase} from '@/utils/marking-session-list-contract';
import { computed, ref, watch } from 'vue'
import {
  getOrganizationById,
  pageFormalSessions,
  pageTrialSessions,
} from '@/apis/mark/marking-organization'
import { showUserError } from '@/utils/error-handler'
import {
  applySessionFilterToListQuery,
  buildMarkingSessionFilterFields,
  
  
  parseSessionFilterModel,
  resolveSessionPageAfterReload,
  resolveSessionTableEmptyDescription
} from '@/utils/marking-session-list-contract'

export type ExamMarkingProgressSessionPhase = MarkingSessionListPhase
export type ExamMarkingProgressSessionFilterModel = MarkingSessionFilterModel

const DEFAULT_PAGE_SIZE = 10

/**
 * 考试工作台试评 / 正评进度页的会话分页列表；真源为 organization/trial|formal/list。
 */
export function useExamMarkingProgressSessionList(
  phase: ComputedRef<ExamMarkingProgressSessionPhase>,
  organizationId: ComputedRef<string | undefined>,
) {
  const trialSessions = ref<TrialSessionResponse[]>([])
  const formalSessions = ref<FormalSessionResponse[]>([])
  const groupOptions = ref<Array<{ value: string, label: string }>>([])
  const sessionsLoading = ref(false)
  const sessionsLoadFailed = ref(false)
  const groupOptionsLoadFailed = ref(false)
  const sessionPagination = ref({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  })
  const sessionFilterModel = ref<ExamMarkingProgressSessionFilterModel>({
    keyword: '',
    status: undefined,
    groupId: undefined,
  })

  let groupOptionsLoadGeneration = 0
  let sessionsLoadGeneration = 0

  const sessionRows = computed(() =>
    phase.value === 'trial' ? trialSessions.value : formalSessions.value,
  )

  const filterFields = computed(() =>
    buildMarkingSessionFilterFields(phase.value, groupOptions.value),
  )

  const sessionTableEmptyDescription = computed(() =>
    resolveSessionTableEmptyDescription({
      phase: phase.value,
      loadFailed: sessionsLoadFailed.value,
      total: sessionPagination.value.total,
      filter: sessionFilterModel.value,
    }),
  )

  function resetSessionState(): void {
    trialSessions.value = []
    formalSessions.value = []
    groupOptions.value = []
    sessionsLoadFailed.value = false
    groupOptionsLoadFailed.value = false
    sessionPagination.value = {
      current: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
    }
    sessionFilterModel.value = {
      keyword: '',
      status: undefined,
      groupId: undefined,
    }
  }

  function bumpLoadGenerations(): void {
    groupOptionsLoadGeneration += 1
    sessionsLoadGeneration += 1
  }

  function isSessionsRequestCurrent(
    generation: number,
    expectedOrgId: string | undefined,
  ): boolean {
    return generation === sessionsLoadGeneration && organizationId.value === expectedOrgId
  }

  function buildListQuery(pageNum: number): SessionListQueryRequest {
    const orgId = organizationId.value
    if (!orgId) {
      throw new Error('organizationId missing')
    }
    const query: SessionListQueryRequest = {
      organizationId: orgId,
      pageNum,
      pageSize: sessionPagination.value.pageSize,
    }
    applySessionFilterToListQuery(query, phase.value, sessionFilterModel.value)
    return query
  }

  async function loadGroupOptions(
    generation = ++groupOptionsLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      if (generation === groupOptionsLoadGeneration && organizationId.value === expectedOrgId) {
        groupOptions.value = []
        groupOptionsLoadFailed.value = false
      }
      return
    }
    try {
      const organization = await getOrganizationById({ organizationId: expectedOrgId })
      if (generation !== groupOptionsLoadGeneration || organizationId.value !== expectedOrgId) {
        return
      }
      groupOptions.value = (organization.groups ?? []).map((group) => ({
        value: group.id,
        label: group.groupName,
      }))
      groupOptionsLoadFailed.value = false
    } catch (error) {
      if (generation !== groupOptionsLoadGeneration || organizationId.value !== expectedOrgId) {
        return
      }
      groupOptionsLoadFailed.value = true
      showUserError(error, '题组列表加载失败')
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
  }

  async function loadSessions(
    pageNum = sessionPagination.value.current,
    generation = ++sessionsLoadGeneration,
    expectedOrgId = organizationId.value,
  ): Promise<void> {
    if (!expectedOrgId) {
      bumpLoadGenerations()
      resetSessionState()
      return
    }
    sessionsLoading.value = true
    try {
      if (phase.value === 'trial') {
        await loadTrialSessions(pageNum, generation, expectedOrgId)
      } else {
        await loadFormalSessions(pageNum, generation, expectedOrgId)
      }
    } catch (error) {
      if (!isSessionsRequestCurrent(generation, expectedOrgId)) {
        return
      }
      sessionsLoadFailed.value = true
      showUserError(
        error,
        phase.value === 'trial' ? '试评会话列表加载失败' : '正评会话列表加载失败',
      )
    } finally {
      if (generation === sessionsLoadGeneration) {
        sessionsLoading.value = false
      }
    }
  }

  async function reloadSessions(): Promise<void> {
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      bumpLoadGenerations()
      resetSessionState()
      return
    }
    const groupGeneration = ++groupOptionsLoadGeneration
    const sessionsGeneration = ++sessionsLoadGeneration
    await Promise.all([
      loadGroupOptions(groupGeneration, expectedOrgId),
      loadSessions(sessionPagination.value.current, sessionsGeneration, expectedOrgId),
    ])
  }

  function applySessionFilter(model: Record<string, unknown>): void {
    sessionFilterModel.value = parseSessionFilterModel(phase.value, model)
    sessionPagination.value.current = 1
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      return
    }
    void loadSessions(1, ++sessionsLoadGeneration, expectedOrgId)
  }

  function resetSessionFilter(): void {
    sessionFilterModel.value = {
      keyword: '',
      status: undefined,
      groupId: undefined,
    }
    sessionPagination.value.current = 1
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      return
    }
    void loadSessions(1, ++sessionsLoadGeneration, expectedOrgId)
  }

  function handleSessionPageChange(page: { current: number, pageSize: number }): void {
    sessionPagination.value.current = page.current
    sessionPagination.value.pageSize = page.pageSize
    const expectedOrgId = organizationId.value
    if (!expectedOrgId) {
      return
    }
    void loadSessions(page.current, ++sessionsLoadGeneration, expectedOrgId)
  }

  watch(
    () => ({ organizationId: organizationId.value, phase: phase.value }),
    (next, prev) => {
      sessionPagination.value.current = 1
      if (!next.organizationId) {
        bumpLoadGenerations()
        resetSessionState()
        return
      }
      if (
        prev
        && (prev.organizationId !== next.organizationId || prev.phase !== next.phase)
      ) {
        bumpLoadGenerations()
        trialSessions.value = []
        formalSessions.value = []
        groupOptions.value = []
        sessionsLoadFailed.value = false
        groupOptionsLoadFailed.value = false
        sessionPagination.value.total = 0
      }
      void reloadSessions()
    },
    { immediate: true },
  )

  return {
    sessionRows,
    sessionsLoading,
    sessionsLoadFailed,
    groupOptionsLoadFailed,
    sessionPagination,
    sessionFilterModel,
    filterFields,
    sessionTableEmptyDescription,
    applySessionFilter,
    resetSessionFilter,
    handleSessionPageChange,
    reloadSessions,
  }
}
