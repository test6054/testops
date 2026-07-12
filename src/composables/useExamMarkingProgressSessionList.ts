import type { ComputedRef } from 'vue'
import { computed, ref, watch } from 'vue'
import type {
  FormalSessionResponse,
  SessionListQueryRequest,
  TrialSessionResponse,
} from '@/apis/mark/marking-organization'
import {
  getOrganizationById,
  pageFormalSessions,
  pageTrialSessions,
} from '@/apis/mark/marking-organization'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { FormalSessionStatusCode } from '@/types/enums/formal-session-status-enum'
import {
  ALL_FORMAL_SESSION_STATUS_CODES,
  FormalSessionStatusDescription,
} from '@/types/enums/formal-session-status-enum'
import type { TrialSessionStatusCode } from '@/types/enums/trial-session-status-enum'
import {
  ALL_TRIAL_SESSION_STATUS_CODES,
  TrialSessionStatusDescription,
} from '@/types/enums/trial-session-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

export type ExamMarkingProgressSessionPhase = 'trial' | 'formal'

export interface ExamMarkingProgressSessionFilterModel {
  keyword: string
  status?: TrialSessionStatusCode | FormalSessionStatusCode
  groupId?: string
}

const DEFAULT_PAGE_SIZE = 10

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
 * 考试工作台试评 / 正评进度页的会话分页列表；真源为 organization/trial|formal/list。
 */
export function useExamMarkingProgressSessionList(
  phase: ComputedRef<ExamMarkingProgressSessionPhase>,
  organizationId: ComputedRef<string | undefined>,
) {
  const trialSessions = ref<TrialSessionResponse[]>([])
  const formalSessions = ref<FormalSessionResponse[]>([])
  const groupOptions = ref<Array<{ value: string; label: string }>>([])
  const sessionsLoading = ref(false)
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

  const sessionRows = computed(() =>
    phase.value === 'trial' ? trialSessions.value : formalSessions.value,
  )

  const hasActiveFilter = computed(
    () =>
      Boolean(sessionFilterModel.value.keyword.trim()) ||
      Boolean(sessionFilterModel.value.status) ||
      Boolean(sessionFilterModel.value.groupId),
  )

  const statusFilterOptions = computed(() => {
    if (phase.value === 'trial') {
      return ALL_TRIAL_SESSION_STATUS_CODES.map((status) => ({
        value: status,
        label: strictEnumLabel(TrialSessionStatusDescription, status, '试评会话状态'),
      }))
    }
    return ALL_FORMAL_SESSION_STATUS_CODES.map((status) => ({
      value: status,
      label: strictEnumLabel(FormalSessionStatusDescription, status, '正评会话状态'),
    }))
  })

  const filterFields = computed((): FilterField[] => [
    {
      key: 'keyword',
      type: 'input',
      inputPrefixIcon: 'search',
      placeholder: phase.value === 'trial' ? '搜索题组、状态、校准结论' : '搜索题组、状态',
      width: 260,
      triggerSearchOnChange: false,
    },
    {
      key: 'status',
      type: 'select',
      placeholder: '全部状态',
      options: statusFilterOptions.value,
      width: 140,
      triggerSearchOnChange: false,
    },
    {
      key: 'groupId',
      type: 'select',
      placeholder: '全部题组',
      options: groupOptions.value.map((item) => ({ label: item.label, value: item.value })),
      width: 160,
      triggerSearchOnChange: false,
    },
  ])

  const sessionTableEmptyDescription = computed(() => {
    if (sessionPagination.value.total === 0 && !hasActiveFilter.value) {
      return phase.value === 'trial' ? '暂无试评会话' : '暂无正评会话'
    }
    if (sessionPagination.value.total === 0 && hasActiveFilter.value) {
      return '未找到匹配会话，请调整筛选条件'
    }
    return phase.value === 'trial' ? '暂无试评会话' : '暂无正评会话'
  })

  function resetSessionState(): void {
    trialSessions.value = []
    formalSessions.value = []
    groupOptions.value = []
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
    const keyword = sessionFilterModel.value.keyword.trim()
    if (keyword) {
      query.keyword = keyword
    }
    if (sessionFilterModel.value.groupId) {
      query.groupId = sessionFilterModel.value.groupId
    }
    if (phase.value === 'trial' && sessionFilterModel.value.status) {
      for (const code of ALL_TRIAL_SESSION_STATUS_CODES) {
        if (code === sessionFilterModel.value.status) {
          query.trialSessionStatus = code
          break
        }
      }
    }
    if (phase.value === 'formal' && sessionFilterModel.value.status) {
      for (const code of ALL_FORMAL_SESSION_STATUS_CODES) {
        if (code === sessionFilterModel.value.status) {
          query.formalSessionStatus = code
          break
        }
      }
    }
    return query
  }

  async function loadGroupOptions(): Promise<void> {
    const orgId = organizationId.value
    if (!orgId) {
      groupOptions.value = []
      return
    }
    try {
      const organization = await getOrganizationById({ organizationId: orgId })
      groupOptions.value = (organization.groups ?? []).map((group) => ({
        value: group.id,
        label: group.groupName,
      }))
    } catch (error) {
      groupOptions.value = []
      showUserError(error, '题组列表加载失败')
    }
  }

  async function loadTrialSessions(pageNum = sessionPagination.value.current): Promise<void> {
    if (!organizationId.value) {
      trialSessions.value = []
      sessionPagination.value.total = 0
      return
    }
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
  }

  async function loadFormalSessions(pageNum = sessionPagination.value.current): Promise<void> {
    if (!organizationId.value) {
      formalSessions.value = []
      sessionPagination.value.total = 0
      return
    }
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
  }

  async function loadSessions(pageNum = sessionPagination.value.current): Promise<void> {
    if (!organizationId.value) {
      resetSessionState()
      return
    }
    sessionsLoading.value = true
    try {
      if (phase.value === 'trial') {
        await loadTrialSessions(pageNum)
      } else {
        await loadFormalSessions(pageNum)
      }
    } catch (error) {
      trialSessions.value = []
      formalSessions.value = []
      sessionPagination.value.total = 0
      showUserError(
        error,
        phase.value === 'trial' ? '试评会话列表加载失败' : '正评会话列表加载失败',
      )
    } finally {
      sessionsLoading.value = false
    }
  }

  async function reloadSessions(): Promise<void> {
    if (!organizationId.value) {
      resetSessionState()
      return
    }
    await Promise.all([loadGroupOptions(), loadSessions(sessionPagination.value.current)])
  }

  function applySessionFilter(model: Record<string, unknown>): void {
    let status: TrialSessionStatusCode | FormalSessionStatusCode | undefined
    const rawStatus = model.status
    if (typeof rawStatus === 'string' && rawStatus) {
      if (phase.value === 'trial') {
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
    void loadSessions(1)
  }

  function resetSessionFilter(): void {
    sessionFilterModel.value = {
      keyword: '',
      status: undefined,
      groupId: undefined,
    }
    sessionPagination.value.current = 1
    void loadSessions(1)
  }

  function handleSessionPageChange(page: { current: number; pageSize: number }): void {
    sessionPagination.value.current = page.current
    sessionPagination.value.pageSize = page.pageSize
    void loadSessions(page.current)
  }

  watch(
    () => ({ organizationId: organizationId.value, phase: phase.value }),
    () => {
      sessionPagination.value.current = 1
      if (!organizationId.value) {
        resetSessionState()
        return
      }
      void reloadSessions()
    },
    { immediate: true },
  )

  return {
    sessionRows,
    sessionsLoading,
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
