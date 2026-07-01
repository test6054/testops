<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="工作台总览"
        :subtitle="pageSubtitle"
      >
        <template #toolbar>
          <UiFilterBar
            v-model="filterBarModel"
            :fields="dashboardFilterFields"
            variant="panel"
            show-labels
            search-text="应用"
            actions-align="end"
            @search="handleFilterChange"
          >
            <template #actions>
              <UiButton variant="outline" size="sm" :loading="dashboardRefreshing" @click="() => load()">
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
              <UiButton size="sm" @click="goExamList">
                查看全部考试
              </UiButton>
            </template>
          </UiFilterBar>
        </template>
      </ContextBar>
    </template>

    <template #rail>
      <MarkingOverviewStageRail
        :exams="overview?.ongoingExams ?? []"
        :journey-stage-summary="overview?.journeyStageSummary ?? []"
        :filtered-count="overview?.filterContext.filteredExamCount ?? 0"
      />
    </template>

    <template #signal>
      <UiSkeletonState
        v-if="signalLoading"
        variant="card"
        :card-count="4"
        compact
      />
      <MarkingOverviewSignalBand
        v-else
        :filter-context="overview?.filterContext"
        :signal-metrics="overview?.signalMetrics"
        :marking-progress-summary="overview?.markingProgressSummary"
        :placeholder="!overview"
      />
    </template>

    <div class="marking-overview__content-grid">
      <UiCard title="进行中的考试" :description="ongoingCardHint" bordered>
        <template #extra>
          <UiButton variant="outline" size="sm" @click="goExamList">
            查看全部
          </UiButton>
        </template>
        <UiSkeletonState
          v-if="examsLoading"
          variant="card"
          :card-count="3"
          compact
        />
        <OngoingExamCardGrid
          v-else
          :exams="overview?.ongoingExams ?? []"
          @navigate="goExamWorkspace"
        />
      </UiCard>
      <UiCard
        title="待处理事项"
        :description="pendingTodoHint"
        bordered
      >
        <template #extra>
          <UiButton variant="ghost" size="sm" @click="goPriorityExamList">
            查看优先推进
          </UiButton>
        </template>
        <UiSkeletonState
          v-if="todosLoading"
          variant="list"
          :rows="5"
          compact
        />
        <PendingTodoFeed
          v-else
          :todos="overview?.pendingTodos ?? []"
          empty-action-label="查看优先推进"
          @navigate="goExamWorkspace"
          @empty-action="goPriorityExamList"
        />
      </UiCard>
    </div>

    <a-row :gutter="20" class="marking-overview__analytics-row">
      <a-col :span="24">
        <UiSkeletonState
          v-if="examsLoading"
          variant="card"
          :card-count="3"
          compact
        />
        <MarkingOverviewAnalytics
          v-else
          :journey-stage-summary="overview?.journeyStageSummary ?? []"
          :marking-progress-summary="overview?.markingProgressSummary ?? emptyMarkingProgressSummary"
          :todo-type-summary="overview?.todoTypeSummary ?? []"
          :filtered-exam-count="overview?.filterContext.filteredExamCount ?? 0"
        />
      </a-col>
    </a-row>

    <a-row :gutter="20" class="marking-overview__bottom-row">
      <a-col :span="24">
        <UiCard title="已发布学情" description="已发布成绩考试学情摘要" bordered>
          <UiSkeletonState
            v-if="examsLoading"
            variant="table"
            :rows="4"
            :columns="5"
            compact
          />
          <template v-else>
            <PublishedExamInsightChart
              :insights="overview?.publishedExamInsights ?? []"
            />
            <PublishedExamInsightTable
              :insights="overview?.publishedExamInsights ?? []"
              class="marking-overview__insight-table"
              @statistics="goArchiveStatistics"
            />
          </template>
        </UiCard>
      </a-col>
    </a-row>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamStatusCode } from '@/apis/mark/exam'
import type {
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardOverviewVO,
  MarkTeacherDashboardQuery,
} from '@/apis/mark/teacher-dashboard'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_FILTER_OPTIONS } from '@/apis/mark/exam'
import {
  loadTeacherDashboardOverviewOnce,
} from '@/apis/mark/teacher-dashboard'
import MarkingOverviewAnalytics from '@/components/mark/dashboard/MarkingOverviewAnalytics.vue'
import MarkingOverviewSignalBand from '@/components/mark/dashboard/MarkingOverviewSignalBand.vue'
import MarkingOverviewStageRail from '@/components/mark/dashboard/MarkingOverviewStageRail.vue'
import OngoingExamCardGrid from '@/components/mark/dashboard/OngoingExamCardGrid.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import PublishedExamInsightChart from '@/components/mark/dashboard/PublishedExamInsightChart.vue'
import PublishedExamInsightTable from '@/components/mark/dashboard/PublishedExamInsightTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUserStore } from '@/stores'
import { formatSemester, isValidSemesterCode, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
  resolveDefaultDashboardFilter,
} from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'
import { buildExamListRoute } from '@/utils/exam-list-navigation'

defineOptions({ name: 'TeacherMarkingOverview' })

const router = useRouter()
const userStore = useUserStore()

const signalLoading = ref(false)
const examsLoading = ref(false)
const todosLoading = ref(false)
const dashboardRefreshing = computed(() => signalLoading.value || examsLoading.value || todosLoading.value)
const overview = ref<MarkTeacherDashboardOverviewVO | null>(null)
const defaultYearSemester = getDefaultAcademicYearAndSemester()
const emptyMarkingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO = {
  candidateCount: 0,
  scanAttentionCount: 0,
  openProcessingTaskCount: 0,
  pendingReviewTaskCount: 0,
  pendingGradeCount: 0,
  confirmedUnpublishedScoreCount: 0,
  totalQuestionGradeCount: 0,
  confirmedQuestionGradeCount: 0,
}
const filter = ref<MarkTeacherDashboardQuery>({
  academicYear: defaultYearSemester.academicYear,
  semester: defaultYearSemester.semester,
  status: 'ACTIVE',
})
const committedFilter = ref<MarkTeacherDashboardQuery>({ ...filter.value })

const academicYearOptions = computed(() => {
  const apiYears = overview.value?.filterOptions.academicYears
  const years = apiYears?.length ? apiYears : generateAcademicYearOptions()
  return years.map(year => ({ label: year, value: year }))
})
const semesterOptions = computed(() => {
  const apiSemesters = overview.value?.filterOptions.semesters
  const codes = apiSemesters?.length
    ? apiSemesters
    : SemesterOptions.map(item => item.value)
  return codes.map(code => ({
    label: formatSemester(code),
    value: code,
  }))
})
const statusOptions = EXAM_STATUS_FILTER_OPTIONS

function isExamStatusCode(value: unknown): value is ExamStatusCode {
  return value === 'ACTIVE' || value === 'CLOSED'
}

function parseFilterAcademicYear(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

function parseFilterSemester(value: unknown): SemesterCode | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  if (typeof value !== 'string' || !isValidSemesterCode(value)) {
    return undefined
  }
  return value
}

function parseFilterExamStatus(value: unknown): ExamStatusCode | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  if (!isExamStatusCode(value)) {
    return undefined
  }
  return value
}

const filterBarModel = computed({
  get: () => ({
    academicYear: filter.value.academicYear ?? undefined,
    semester: filter.value.semester ?? undefined,
    status: filter.value.status ?? undefined,
  }),
  set: (value: Record<string, unknown>) => {
    filter.value = {
      academicYear: parseFilterAcademicYear(value.academicYear),
      semester: parseFilterSemester(value.semester),
      status: parseFilterExamStatus(value.status),
    }
  },
})

const dashboardFilterFields = computed<FilterField[]>(() => [
  {
    key: 'academicYear',
    label: '学年',
    type: 'select',
    placeholder: '全部学年',
    options: academicYearOptions.value,
    allowClear: true,
    triggerSearchOnChange: true,
  },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '全部学期',
    options: semesterOptions.value,
    allowClear: true,
    triggerSearchOnChange: true,
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '全部状态',
    options: statusOptions,
    allowClear: true,
    defaultValue: 'ACTIVE',
    triggerSearchOnChange: true,
  },
])

const pageSubtitle = computed(() => {
  if (signalLoading.value && !overview.value) return '加载筛选范围内考试概览'
  if (!overview.value) return '加载筛选范围内考试概览'
  const total = overview.value.filterContext.filteredExamCount
  const parts: string[] = []
  if (filter.value.academicYear) parts.push(filter.value.academicYear)
  if (filter.value.semester) parts.push(formatSemester(filter.value.semester))
  const scope = parts.length ? parts.join(' ') : '全部学年学期'
  return `${scope} · 共 ${total} 场考试`
})

const pendingTodoHint = computed(() => {
  if (todosLoading.value) return '加载待处理事项'
  const todos = overview.value?.pendingTodos ?? []
  if (!overview.value) return ''
  if (!todos.length) return '暂无待处理事项'
  const urgent = todos.filter(item =>
    item.blocking
    || item.todoType === 'SCAN_ATTENTION'
    || item.todoType === 'REVIEW_PENDING',
  ).length
  if (urgent > 0) return `共 ${todos.length} 项待处理，${urgent} 项紧急`
  return `共 ${todos.length} 项待处理`
})

const ongoingCardHint = computed(() => {
  if (examsLoading.value) return '加载进行中考试'
  if (!overview.value) return ''
  const count = overview.value.ongoingExams.length
  if (count === 0) return '当前筛选暂无进行中的考试'
  return '优先推进中的考试，点击进入工作台'
})

function assertTenantContract(data: MarkTeacherDashboardOverviewVO) {
  const sessionTenantId = userStore.userInfo.tenantId
  if (sessionTenantId && String(data.filterContext.tenantId) !== String(sessionTenantId)) {
    throw new TypeError('阅卷概览租户契约不一致')
  }
}

function isFilterRangeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('不在可选范围内')
}

function applyOverview(data: MarkTeacherDashboardOverviewVO) {
  overview.value = data
  filter.value = {
    academicYear: data.filterContext.academicYear ?? filter.value.academicYear,
    semester: data.filterContext.semester ?? filter.value.semester,
    status: data.filterContext.status ?? filter.value.status ?? 'ACTIVE',
  }
  committedFilter.value = { ...filter.value }
}

let inflightOverview: Promise<MarkTeacherDashboardOverviewVO> | null = null

async function fetchOverview(
  query: MarkTeacherDashboardQuery,
  options?: { rollbackFilterOnError?: boolean },
): Promise<MarkTeacherDashboardOverviewVO> {
  if (!inflightOverview) {
    inflightOverview = loadOverviewWithFallback(query, options).finally(() => {
      inflightOverview = null
    })
  }
  return inflightOverview
}

async function loadOverviewWithFallback(
  query: MarkTeacherDashboardQuery,
  options?: { rollbackFilterOnError?: boolean },
): Promise<MarkTeacherDashboardOverviewVO> {
  const silentConfig = { showErrorMessage: false }
  try {
    const data = await loadTeacherDashboardOverviewOnce({ ...query })
    assertTenantContract(data)
    return data
  } catch (error) {
    if (isFilterRangeError(error) && (query.academicYear || query.semester)) {
      const bootstrap = await loadTeacherDashboardOverviewOnce({}, silentConfig)
      assertTenantContract(bootstrap)
      const reconciled = resolveDefaultDashboardFilter(bootstrap.filterOptions)
      filter.value = {
        ...filter.value,
        academicYear: reconciled.academicYear,
        semester: reconciled.semester,
      }
      const data = await loadTeacherDashboardOverviewOnce({ ...filter.value })
      assertTenantContract(data)
      return data
    }
    if (options?.rollbackFilterOnError) {
      filter.value = { ...committedFilter.value }
    }
    throw error
  }
}

async function loadSignalSection(
  query: MarkTeacherDashboardQuery,
  options?: { rollbackFilterOnError?: boolean },
): Promise<void> {
  signalLoading.value = true
  try {
    const data = await fetchOverview(query, options)
    assertTenantContract(data)
    applyOverview(data)
  } finally {
    signalLoading.value = false
  }
}

async function loadExamsSection(
  query: MarkTeacherDashboardQuery,
  options?: { rollbackFilterOnError?: boolean },
): Promise<void> {
  examsLoading.value = true
  try {
    const data = await fetchOverview(query, options)
    assertTenantContract(data)
    applyOverview(data)
  } finally {
    examsLoading.value = false
  }
}

async function loadTodosSection(
  query: MarkTeacherDashboardQuery,
  options?: { rollbackFilterOnError?: boolean },
): Promise<void> {
  todosLoading.value = true
  try {
    const data = await fetchOverview(query, options)
    assertTenantContract(data)
    applyOverview(data)
  } finally {
    todosLoading.value = false
  }
}

async function load(options?: { rollbackFilterOnError?: boolean }) {
  const query = { ...filter.value }
  try {
    await Promise.all([
      loadSignalSection(query, options),
      loadExamsSection(query, options),
      loadTodosSection(query, options),
    ])
    committedFilter.value = { ...filter.value }
  } catch (error) {
    overview.value = null
    showUserError(error, '阅卷概览加载失败')
  }
}

function handleFilterChange() {
  if (!filter.value.academicYear) {
    filter.value.semester = undefined
  }
  void load({ rollbackFilterOnError: true })
}

function goExamList() {
  void router.push({ name: 'TeacherExamList' })
}

/** 待处理事项深链：携带当前学年学期筛选，打开考试列表「优先推进」Tab。 */
function goPriorityExamList() {
  void router.push(buildExamListRoute({
    tab: 'priority',
    academicYear: filter.value.academicYear,
    semester: filter.value.semester,
    status: filter.value.status,
  }))
}

function goExamWorkspace(routeName: string | undefined, examId: string | undefined) {
  if (!routeName || !examId) return
  void router.push({ name: routeName, params: { examId } })
}

function goArchiveStatistics(examId: string) {
  void router.push({ name: 'TeacherExamWorkspaceArchiveStatistics', params: { examId } })
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.marking-overview__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--dp-space-5);
  margin-bottom: var(--dp-space-5);
}

.marking-overview__analytics-row,
.marking-overview__bottom-row {
  margin-bottom: 0;
}

.marking-overview__analytics-row {
  margin-bottom: var(--dp-space-5);
}

.marking-overview__bottom-row {
  margin-top: 0;
}

@media (max-width: 1199px) {
  .marking-overview__content-grid {
    grid-template-columns: 1fr;
  }
}

.marking-overview__insight-table {
  margin-top: 16px;
}
</style>
