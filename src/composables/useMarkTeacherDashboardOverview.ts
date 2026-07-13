import type {
  MarkTeacherDashboardExamsSectionVO,
  MarkTeacherDashboardOverviewVO,
  MarkTeacherDashboardQuery,
  MarkTeacherDashboardSectionQuery,
  MarkTeacherDashboardSignalSectionVO,
  MarkTeacherDashboardTodosSectionVO,
} from '@/apis/mark/teacher-dashboard'
import type { MarkTeacherDashboardPendingTodoScopeCode } from '@/types/enums/mark-teacher-dashboard-pending-todo-scope-enum'
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
  MarkTeacherDashboardPendingTodoScopeCode as PendingTodoScopeCode,
} from '@/types/enums/mark-teacher-dashboard-pending-todo-scope-enum'
import {
  getDefaultAcademicYearAndSemester,
  resolveDefaultDashboardFilter,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
import {
  buildMarkDashboardAcademicYearSelectOptions,
  buildMarkDashboardSemesterSelectOptions,
  buildMarkDashboardStatusSelectOptions,
} from '@/utils/mark-dashboard-filter-options'

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
  const defaultYearSemester = getDefaultAcademicYearAndSemester()
  const signalLoading = ref(false)
  const examsLoading = ref(false)
  const todosLoading = ref(false)
  const signalLoadFailed = ref(false)
  const examsLoadFailed = ref(false)
  const todosLoadFailed = ref(false)
  const overview = ref<MarkTeacherDashboardOverviewVO | null>(null)
  const loadKey = ref<string | null>(null)
  const filter = ref<MarkTeacherDashboardQuery>({
    academicYear: options.initialFilter?.academicYear ?? defaultYearSemester.academicYear,
    semester: options.initialFilter?.semester ?? defaultYearSemester.semester,
    status: options.initialFilter?.status ?? ExamStatusCode.ACTIVE,
    publishedInsightLimit: options.initialFilter?.publishedInsightLimit,
  })
  const committedFilter = ref<MarkTeacherDashboardQuery>({ ...filter.value })
  const filterChangeLoading = ref(false)
  const ongoingExamPageNum = ref(1)
  const ongoingExamPageSize = ref(MARK_DASHBOARD_ONGOING_EXAM_PAGE_SIZE)
  const pendingTodoPageNum = ref(1)
  const pendingTodoPageSize = ref(MARK_DASHBOARD_PENDING_TODO_PAGE_SIZE)
  const pendingTodoScope = ref<MarkTeacherDashboardPendingTodoScopeCode>(PendingTodoScopeCode.ALL)

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

  function buildFilterQuery(): MarkTeacherDashboardQuery | null {
    if (!ensureAcademicYearSemesterPair(filter.value.academicYear, filter.value.semester)) {
      return null
    }
    const termQuery = buildOptionalAcademicYearSemesterQuery(
      filter.value.academicYear,
      filter.value.semester,
    )
    if (termQuery === null) {
      return null
    }
    return {
      status: filter.value.status,
      publishedInsightLimit: filter.value.publishedInsightLimit,
      ...termQuery,
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
      ongoingExamPage: {
        pageNum: ongoingExamPageNum.value,
        pageSize: ongoingExamPageSize.value,
      },
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

  function applySignalSection(data: MarkTeacherDashboardSignalSectionVO): void {
    const previous = overview.value
    loadKey.value = data.loadKey
    syncingFilterFromServer = true
    overview.value = {
      filterContext: data.filterContext,
      filterOptions: data.filterOptions,
      signalMetrics: data.signalMetrics,
      markingProgressSummary: data.markingProgressSummary,
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
    if (filteredExamCount > 0 && (current.ongoingExamPage.total ?? 0) === 0) {
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
    const sectionQuery = buildSectionQuery()
    if (!sectionQuery) {
      return
    }
    ongoingExamPageNum.value = pageNum
    if (pageSize != null) {
      ongoingExamPageSize.value = pageSize
    }
    sectionQuery.ongoingExamPage = {
      pageNum,
      pageSize: ongoingExamPageSize.value,
    }
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
    if (!filter.value.academicYear) {
      filter.value.semester = undefined
    }
    if (!ensureAcademicYearSemesterPair(filter.value.academicYear, filter.value.semester)) {
      debouncedLoadFromFilter.cancel()
      return
    }
    debouncedLoadFromFilter()
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
    pendingTodoPageNum,
    pendingTodoPageSize,
    pendingTodoScope,
    suppressTodoTabReload,
    load,
    loadOngoingExamPage,
    loadPendingTodoPage,
    handleFilterChange,
    cancelPendingFilterLoad,
  }
}
