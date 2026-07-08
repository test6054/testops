import type {
  MarkTeacherDashboardExamsSectionVO,
  MarkTeacherDashboardOverviewVO,
  MarkTeacherDashboardQuery,
  MarkTeacherDashboardSectionQuery,
  MarkTeacherDashboardSignalSectionVO,
  MarkTeacherDashboardTodosSectionVO,
} from '@/apis/mark/teacher-dashboard'
import {
  loadTeacherDashboardExamsSection,
  loadTeacherDashboardSignalSection,
  loadTeacherDashboardSignalSectionSilent,
  loadTeacherDashboardTodosSection,
} from '@/apis/mark/teacher-dashboard'
import { debounce } from 'lodash-es'
import { computed, onUnmounted, ref } from 'vue'
import { ExamStatusCode } from '@/apis/mark/exam'
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
  const filter = ref<MarkTeacherDashboardQuery>({
    academicYear: options.initialFilter?.academicYear ?? defaultYearSemester.academicYear,
    semester: options.initialFilter?.semester ?? defaultYearSemester.semester,
    status: options.initialFilter?.status ?? ExamStatusCode.ACTIVE,
    ongoingLimit: options.initialFilter?.ongoingLimit,
    publishedInsightLimit: options.initialFilter?.publishedInsightLimit,
    todoLimit: options.initialFilter?.todoLimit,
  })
  const committedFilter = ref<MarkTeacherDashboardQuery>({ ...filter.value })

  let loadGeneration = 0

  const filterRefreshing = computed(
    () => signalLoading.value || examsLoading.value || todosLoading.value,
  )

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

  function applySignalSection(data: MarkTeacherDashboardSignalSectionVO): void {
    const previous = overview.value
    overview.value = {
      filterContext: data.filterContext,
      filterOptions: data.filterOptions,
      signalMetrics: data.signalMetrics,
      markingProgressSummary: data.markingProgressSummary,
      todoTypeSummary: previous?.todoTypeSummary ?? [],
      journeyStageSummary: previous?.journeyStageSummary ?? [],
      ongoingExams: previous?.ongoingExams ?? [],
      pendingTodos: previous?.pendingTodos ?? [],
      publishedExamInsights: previous?.publishedExamInsights ?? [],
    }
    filter.value = {
      academicYear: data.filterContext.academicYear,
      semester: data.filterContext.semester,
      status: data.filterContext.status,
    }
  }

  function applyExamsSection(data: MarkTeacherDashboardExamsSectionVO): void {
    if (!overview.value) {
      return
    }
    overview.value = {
      ...overview.value,
      ongoingExams: data.ongoingExams,
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
    overview.value = {
      ...overview.value,
      pendingTodos: data.pendingTodos,
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

  async function load(loadOptions?: { rollbackFilterOnError?: boolean }): Promise<void> {
    if (!ensureAcademicYearSemesterPair(filter.value.academicYear, filter.value.semester)) {
      return
    }
    const termQuery = buildOptionalAcademicYearSemesterQuery(
      filter.value.academicYear,
      filter.value.semester,
    )
    if (termQuery === null) {
      return
    }
    const query: MarkTeacherDashboardQuery = {
      status: filter.value.status,
      ongoingLimit: filter.value.ongoingLimit,
      publishedInsightLimit: filter.value.publishedInsightLimit,
      todoLimit: filter.value.todoLimit,
      ...termQuery,
    }
    const generation = ++loadGeneration
    signalLoadFailed.value = false
    examsLoadFailed.value = false
    todosLoadFailed.value = false
    signalLoading.value = true
    examsLoading.value = true
    todosLoading.value = true
    try {
      const signal = await loadSignalWithFallback(query, loadOptions)
      if (generation !== loadGeneration) {
        return
      }
      applySignalSection(signal)
      committedFilter.value = { ...filter.value }
      signalLoading.value = false

      const sectionQuery: MarkTeacherDashboardSectionQuery = {
        ...query,
        loadKey: signal.loadKey,
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
      examsLoading.value = false

      if (todosResult.status === 'fulfilled') {
        applyTodosSection(todosResult.value)
      } else {
        todosLoadFailed.value = true
        showUserError(todosResult.reason, '待处理事项加载失败')
      }
      todosLoading.value = false
    } catch (error) {
      if (generation !== loadGeneration) {
        return
      }
      signalLoadFailed.value = true
      signalLoading.value = false
      examsLoading.value = false
      todosLoading.value = false
      showUserError(error, '阅卷概览加载失败')
    }
  }

  const debouncedLoadFromFilter = debounce(() => {
    void load({ rollbackFilterOnError: true })
  }, FILTER_CHANGE_DEBOUNCE_MS)

  function handleFilterChange(): void {
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
    load,
    handleFilterChange,
    cancelPendingFilterLoad,
  }
}
