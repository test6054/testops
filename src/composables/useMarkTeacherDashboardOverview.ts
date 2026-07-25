import type {
  MarkTeacherDashboardExamsSectionVO,
  MarkTeacherDashboardOverviewVO,
  MarkTeacherDashboardQuery,
  MarkTeacherDashboardSectionQuery,
  MarkTeacherDashboardSignalSectionVO,
  MarkTeacherDashboardTodosSectionVO,
} from '@/apis/mark/teacher-dashboard'
import type { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { debounce } from 'lodash-es'
import { computed, onUnmounted, ref } from 'vue'
import { ExamStatusCode } from '@/apis/mark/exam'
import {
  loadTeacherDashboardExamsSection,
  loadTeacherDashboardSignalSection,
  loadTeacherDashboardSignalSectionSilent,
  loadTeacherDashboardTodosSection,
} from '@/apis/mark/teacher-dashboard'
import {
  MARK_DASHBOARD_ONGOING_EXAM_PAGE_SIZE,
  MARK_DASHBOARD_PENDING_TODO_PAGE_SIZE,
  MarkTeacherDashboardPendingTodoScopeCode,
} from '@/types/enums/mark-teacher-dashboard-pending-todo-scope-enum'
import {
  resolveDefaultDashboardFilter,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
  requireWorkbenchAcademicYearSemester,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
import {
  buildMarkDashboardAcademicYearSelectOptions,
  buildMarkDashboardSemesterSelectOptions,
  buildMarkDashboardStatusSelectOptions,
} from '@/utils/mark-dashboard-filter-options'
import {
  resolveDefaultPendingTodoTab,
  resolvePendingTodoScopeByTab,
} from '@/utils/mark-dashboard-todo'
import {
  isCurrentWorkbenchTerm,
  resolveCurrentWorkbenchTerm,
  resolveMarkWorkbenchTermFilter,
  writeMarkWorkbenchTermPreference,
} from '@/utils/mark-workbench-term-scope'

const FILTER_CHANGE_DEBOUNCE_MS = 250

const EMPTY_PAGE = {
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 10,
  pages: 0,
}

export interface UseMarkTeacherDashboardOverviewOptions {
  /** 初始筛选；缺省为当前学年学期 + ACTIVE */
  initialFilter?: Partial<MarkTeacherDashboardQuery>
}

/** 教师阅卷概览三段加载：signal / exams / todos，含 generation 竞态锁与 filter reconcile。 */
export function useMarkTeacherDashboardOverview(
  options: UseMarkTeacherDashboardOverviewOptions = {},
) {
  const workbenchDefaults = resolveMarkWorkbenchTermFilter()
  const signalLoading = ref(false)
  const examsLoading = ref(false)
  const todosLoading = ref(false)
  const signalLoadFailed = ref(false)
  const examsLoadFailed = ref(false)
  const todosLoadFailed = ref(false)
  const overview = ref<MarkTeacherDashboardOverviewVO | null>(null)
  const loadKey = ref<string | null>(null)
  const initialTerm = requireWorkbenchAcademicYearSemester(
    options.initialFilter?.academicYear ?? workbenchDefaults.academicYear,
    options.initialFilter?.semester ?? workbenchDefaults.semester,
  )
  const filter = ref<MarkTeacherDashboardQuery>({
    academicYear: initialTerm.academicYear,
    semester: initialTerm.semester,
    status: options.initialFilter?.status ?? workbenchDefaults.status ?? ExamStatusCode.ACTIVE,
    publishedInsightLimit: options.initialFilter?.publishedInsightLimit,
  })
  const committedFilter = ref<MarkTeacherDashboardQuery>({ ...filter.value })
  const filterChangeLoading = ref(false)
  const ongoingExamPageNum = ref(1)
  const ongoingExamPageSize = ref(MARK_DASHBOARD_ONGOING_EXAM_PAGE_SIZE)
  /** 进行中考试六步旅程服务端筛选；空串表示不过滤 */
  const ongoingExamJourneyKey = ref<MarkTeacherDashboardJourneyKeyCode | ''>('')
  const pendingTodoPageNum = ref(1)
  const pendingTodoPageSize = ref(MARK_DASHBOARD_PENDING_TODO_PAGE_SIZE)
  const pendingTodoScope = ref<MarkTeacherDashboardPendingTodoScopeCode>(MarkTeacherDashboardPendingTodoScopeCode.ALL)
  /** 教师本会话是否手动切过待办 Tab；未切过则按 signal 全量计数选默认档。 */
  const pendingTodoTabUserChosen = ref(false)

  let loadGeneration = 0
  let syncingFilterFromServer = false
  const suppressTodoTabReload = ref(false)

  const filterRefreshing = computed(() => filterChangeLoading.value)

  const academicYearOptions = computed(() =>
    buildMarkDashboardAcademicYearSelectOptions(overview.value?.filterOptions.academicYears),
  )
  const semesterOptions = computed(() =>
    buildMarkDashboardSemesterSelectOptions(overview.value?.filterOptions.semesters),
  )
  const statusOptions = computed(() =>
    buildMarkDashboardStatusSelectOptions(overview.value?.filterOptions.statuses),
  )

  function isFilterRangeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : ''
    return message.includes('不在可选范围内')
  }

  function normalizeAndPersistWorkbenchTerm(): void {
    const term = requireWorkbenchAcademicYearSemester(
      filter.value.academicYear,
      filter.value.semester,
    )
    filter.value.academicYear = term.academicYear
    filter.value.semester = term.semester
    writeMarkWorkbenchTermPreference({
      academicYear: term.academicYear,
      semester: term.semester,
      status: filter.value.status ?? null,
    })
  }

  function buildFilterQuery(): MarkTeacherDashboardQuery | null {
    normalizeAndPersistWorkbenchTerm()
    if (!ensureAcademicYearSemesterPair(filter.value.academicYear, filter.value.semester)) {
      return null
    }
    const termQuery = buildOptionalAcademicYearSemesterQuery(
      filter.value.academicYear,
      filter.value.semester,
    )
    if (termQuery === null || !termQuery.academicYear || !termQuery.semester) {
      return null
    }
    return {
      status: filter.value.status,
      publishedInsightLimit: filter.value.publishedInsightLimit,
      ...termQuery,
    }
  }

  function buildOngoingExamPageQuery(pageNum: number, pageSize: number) {
    return {
      pageNum,
      pageSize,
      ...(ongoingExamJourneyKey.value ? { journeyKey: ongoingExamJourneyKey.value } : {}),
    }
  }

  function buildSectionQuery(): MarkTeacherDashboardSectionQuery | null {
    const query = buildFilterQuery()
    if (!query || !loadKey.value) {
      return null
    }
    return {
      ...query,
      loadKey: loadKey.value,
      ongoingExamPage: buildOngoingExamPageQuery(ongoingExamPageNum.value, ongoingExamPageSize.value),
      pendingTodoPage: {
        pageNum: pendingTodoPageNum.value,
        pageSize: pendingTodoPageSize.value,
        todoScope: pendingTodoScope.value,
      },
    }
  }

  function resetListPagination(): void {
    ongoingExamPageNum.value = 1
    pendingTodoPageNum.value = 1
  }

  function clearOngoingExamJourneyFilter(): void {
    ongoingExamJourneyKey.value = ''
  }

  /** 未手动选 Tab 时，按 signalMetrics 全量计数写入待办 scope，保证首屏列表与默认 Tab 同真源。 */
  function syncDefaultPendingTodoScopeFromSignal(
    metrics: MarkTeacherDashboardSignalSectionVO['signalMetrics'],
  ): void {
    if (pendingTodoTabUserChosen.value) {
      return
    }
    if (!metrics || metrics.pendingTodoRowCount <= 0) {
      pendingTodoScope.value = MarkTeacherDashboardPendingTodoScopeCode.ALL
      return
    }
    pendingTodoScope.value = resolvePendingTodoScopeByTab(
      resolveDefaultPendingTodoTab({
        pendingTodoRowCount: metrics.pendingTodoRowCount,
        urgentTodoCount: metrics.urgentTodoCount,
        attentionTodoCount: metrics.attentionTodoCount,
      }),
    )
  }

  function markPendingTodoTabUserChosen(): void {
    pendingTodoTabUserChosen.value = true
  }

  function applySignalSection(data: MarkTeacherDashboardSignalSectionVO): void {
    const previous = overview.value
    loadKey.value = data.loadKey
    syncingFilterFromServer = true
    overview.value = {
      filterContext: data.filterContext,
      filterOptions: data.filterOptions,
      signalMetrics: data.signalMetrics,
      markingProgressSummary: data.markingProgressSummary,
      dailyProgressTrend: data.dailyProgressTrend ?? [],
      todoTypeSummary: previous?.todoTypeSummary ?? [],
      journeyStageSummary: previous?.journeyStageSummary ?? [],
      ongoingExamPage: previous?.ongoingExamPage ?? { ...EMPTY_PAGE, pageSize: ongoingExamPageSize.value },
      pendingTodoPage: previous?.pendingTodoPage ?? { ...EMPTY_PAGE, pageSize: pendingTodoPageSize.value },
      publishedExamInsights: previous?.publishedExamInsights ?? [],
    }
    filter.value = {
      ...filter.value,
      academicYear: data.filterContext.academicYear,
      semester: data.filterContext.semester,
      status: data.filterContext.status ?? filter.value.status,
    }
    queueMicrotask(() => {
      syncingFilterFromServer = false
    })
  }

  function applyExamsSection(data: MarkTeacherDashboardExamsSectionVO): void {
    if (!overview.value) {
      return
    }
    if (!data.ongoingExamPage || !Array.isArray(data.ongoingExamPage.list)) {
      throw new Error('进行中考试分页契约缺失')
    }
    ongoingExamPageNum.value = data.ongoingExamPage.pageNum
    ongoingExamPageSize.value = data.ongoingExamPage.pageSize
    overview.value = {
      ...overview.value,
      ongoingExamPage: data.ongoingExamPage,
      publishedExamInsights: data.publishedExamInsights,
      journeyStageSummary: data.journeyStageSummary,
      todoTypeSummary: data.todoTypeSummary,
      markingProgressSummary: data.markingProgressSummary,
      signalMetrics: data.signalMetrics ?? overview.value.signalMetrics,
    }
  }

  function applyTodosSection(data: MarkTeacherDashboardTodosSectionVO): void {
    if (!overview.value) {
      return
    }
    if (!data.pendingTodoPage || !Array.isArray(data.pendingTodoPage.list)) {
      throw new Error('待处理事项分页契约缺失')
    }
    pendingTodoPageNum.value = data.pendingTodoPage.pageNum
    pendingTodoPageSize.value = data.pendingTodoPage.pageSize
    overview.value = {
      ...overview.value,
      pendingTodoPage: data.pendingTodoPage,
      todoTypeSummary: data.todoTypeSummary,
    }
  }

  async function loadSignalWithFallback(
    query: MarkTeacherDashboardQuery,
    loadOptions?: { rollbackFilterOnError?: boolean },
  ): Promise<MarkTeacherDashboardSignalSectionVO> {
    try {
      return await loadTeacherDashboardSignalSection({ ...query })
    } catch (error) {
      if (isFilterRangeError(error) && (query.academicYear || query.semester)) {
        const bootstrap = await loadTeacherDashboardSignalSectionSilent({})
        const reconciled = resolveDefaultDashboardFilter(bootstrap.filterOptions)
        filter.value = {
          ...filter.value,
          academicYear: reconciled.academicYear,
          semester: reconciled.semester,
        }
        return await loadTeacherDashboardSignalSection({ ...filter.value })
      }
      if (loadOptions?.rollbackFilterOnError) {
        filter.value = { ...committedFilter.value }
      }
      throw error
    }
  }

  async function reconcileSectionPagesAfterLoad(): Promise<void> {
    const current = overview.value
    if (!current || !loadKey.value) {
      return
    }
    const filteredExamCount = current.filterContext.filteredExamCount ?? 0
    // 旅程筛选下 total=0 是合法空结果，禁止再拉全量段伪装加载
    if (
      !ongoingExamJourneyKey.value
      && filteredExamCount > 0
      && (current.ongoingExamPage.total ?? 0) === 0
    ) {
      await loadOngoingExamPage(ongoingExamPageNum.value)
    }
    const pendingTodoRowCount = current.signalMetrics?.pendingTodoRowCount ?? 0
    if (pendingTodoRowCount > 0 && (current.pendingTodoPage.total ?? 0) === 0) {
      await loadPendingTodoPage(pendingTodoPageNum.value, { todoScope: pendingTodoScope.value })
    }
  }

  async function load(loadOptions?: {
    rollbackFilterOnError?: boolean
    fromFilterChange?: boolean
  }): Promise<void> {
    const query = buildFilterQuery()
    if (!query) {
      return
    }
    if (loadOptions?.fromFilterChange) {
      resetListPagination()
      clearOngoingExamJourneyFilter()
    }
    const generation = ++loadGeneration
    if (loadOptions?.fromFilterChange) {
      filterChangeLoading.value = true
    }
    signalLoadFailed.value = false
    examsLoadFailed.value = false
    todosLoadFailed.value = false
    signalLoading.value = true
    examsLoading.value = true
    todosLoading.value = true
    suppressTodoTabReload.value = true
    try {
      const signal = await loadSignalWithFallback(query, loadOptions)
      if (generation !== loadGeneration) {
        return
      }
      applySignalSection(signal)
      syncDefaultPendingTodoScopeFromSignal(signal.signalMetrics)
      committedFilter.value = { ...filter.value }
      signalLoading.value = false

      const sectionQuery = buildSectionQuery()
      if (!sectionQuery) {
        return
      }
      const [examsResult, todosResult] = await Promise.allSettled([
        loadTeacherDashboardExamsSection(sectionQuery),
        loadTeacherDashboardTodosSection(sectionQuery),
      ])
      if (generation !== loadGeneration) {
        return
      }

      if (examsResult.status === 'fulfilled') {
        applyExamsSection(examsResult.value)
      } else {
        examsLoadFailed.value = true
        showUserError(examsResult.reason, '进行中考试加载失败')
      }

      if (todosResult.status === 'fulfilled') {
        applyTodosSection(todosResult.value)
      } else {
        todosLoadFailed.value = true
        showUserError(todosResult.reason, '待处理事项加载失败')
      }

      await reconcileSectionPagesAfterLoad()
    } catch (error) {
      if (generation !== loadGeneration) {
        return
      }
      signalLoadFailed.value = true
      showUserError(error, '阅卷概览加载失败')
    } finally {
      if (generation === loadGeneration) {
        signalLoading.value = false
        examsLoading.value = false
        todosLoading.value = false
        filterChangeLoading.value = false
        suppressTodoTabReload.value = false
      }
    }
  }

  async function loadOngoingExamPage(pageNum: number, pageSize?: number): Promise<void> {
    if (!loadKey.value) {
      return
    }
    ongoingExamPageNum.value = pageNum
    if (pageSize != null) {
      ongoingExamPageSize.value = pageSize
    }
    const sectionQuery = buildSectionQuery()
    if (!sectionQuery) {
      return
    }
    sectionQuery.ongoingExamPage = buildOngoingExamPageQuery(pageNum, ongoingExamPageSize.value)
    examsLoading.value = true
    examsLoadFailed.value = false
    try {
      const data = await loadTeacherDashboardExamsSection(sectionQuery)
      applyExamsSection(data)
    } catch (error) {
      examsLoadFailed.value = true
      showUserError(error, '进行中考试加载失败')
    } finally {
      examsLoading.value = false
    }
  }

  /**
   * 切换六步旅程服务端筛选：重置页码并重载 exams 段，保证 total 与列表同属筛选域。
   */
  async function setOngoingExamJourneyKey(
    journeyKey: MarkTeacherDashboardJourneyKeyCode | '',
  ): Promise<void> {
    if (ongoingExamJourneyKey.value === journeyKey) {
      return
    }
    ongoingExamJourneyKey.value = journeyKey
    await loadOngoingExamPage(1)
  }

  async function loadPendingTodoPage(
    pageNum: number,
    options?: { pageSize?: number, todoScope?: MarkTeacherDashboardPendingTodoScopeCode },
  ): Promise<void> {
    const sectionQuery = buildSectionQuery()
    if (!sectionQuery) {
      return
    }
    pendingTodoPageNum.value = pageNum
    if (options?.pageSize != null) {
      pendingTodoPageSize.value = options.pageSize
    }
    if (options?.todoScope != null) {
      pendingTodoScope.value = options.todoScope
    }
    sectionQuery.pendingTodoPage = {
      pageNum,
      pageSize: pendingTodoPageSize.value,
      todoScope: pendingTodoScope.value,
    }
    todosLoading.value = true
    todosLoadFailed.value = false
    try {
      const data = await loadTeacherDashboardTodosSection(sectionQuery)
      applyTodosSection(data)
    } catch (error) {
      todosLoadFailed.value = true
      showUserError(error, '待处理事项加载失败')
    } finally {
      todosLoading.value = false
    }
  }

  const debouncedLoadFromFilter = debounce(() => {
    void load({ rollbackFilterOnError: true, fromFilterChange: true })
  }, FILTER_CHANGE_DEBOUNCE_MS)

  function handleFilterChange(): void {
    if (syncingFilterFromServer) {
      return
    }
    normalizeAndPersistWorkbenchTerm()
    if (!ensureAcademicYearSemesterPair(filter.value.academicYear, filter.value.semester)) {
      debouncedLoadFromFilter.cancel()
      return
    }
    debouncedLoadFromFilter()
  }

  const isCurrentTermSelected = computed(() =>
    isCurrentWorkbenchTerm(filter.value.academicYear, filter.value.semester),
  )

  /** 一键回到当前学年学期，保留状态筛选。 */
  function handleUseCurrentTerm(): void {
    if (syncingFilterFromServer) {
      return
    }
    const current = resolveCurrentWorkbenchTerm()
    filter.value.academicYear = current.academicYear
    filter.value.semester = current.semester
    handleFilterChange()
  }

  function cancelPendingFilterLoad(): void {
    debouncedLoadFromFilter.cancel()
  }

  onUnmounted(() => {
    cancelPendingFilterLoad()
  })

  return {
    overview,
    filter,
    committedFilter,
    signalLoading,
    examsLoading,
    todosLoading,
    signalLoadFailed,
    examsLoadFailed,
    todosLoadFailed,
    filterRefreshing,
    academicYearOptions,
    semesterOptions,
    statusOptions,
    ongoingExamPageNum,
    ongoingExamPageSize,
    ongoingExamJourneyKey,
    pendingTodoPageNum,
    pendingTodoPageSize,
    pendingTodoScope,
    pendingTodoTabUserChosen,
    suppressTodoTabReload,
    load,
    loadOngoingExamPage,
    setOngoingExamJourneyKey,
    clearOngoingExamJourneyFilter,
    loadPendingTodoPage,
    handleFilterChange,
    handleUseCurrentTerm,
    isCurrentTermSelected,
    cancelPendingFilterLoad,
    markPendingTodoTabUserChosen,
  }
}
