<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="工作台总览" :subtitle="pageSubtitle">
        <template #status>
          <a-select
            v-model:value="filter.academicYear"
            :options="academicYearOptions"
            style="width: 120px"
            placeholder="学年"
            allow-clear
            @change="handleFilterChange"
          />
          <a-select
            v-model:value="filter.semester"
            :options="semesterOptions"
            style="width: 120px"
            placeholder="学期"
            allow-clear
            :disabled="!filter.academicYear"
            @change="handleFilterChange"
          />
          <a-select
            v-model:value="filter.status"
            :options="statusOptions"
            style="width: 120px"
            placeholder="状态"
            allow-clear
            @change="handleFilterChange"
          />
        </template>
        <template #actions>
          <UiButton size="sm" @click="goExamList"> 查看全部考试 </UiButton>
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
      <UiSkeletonState v-if="signalLoading" variant="card" :card-count="4" compact />
      <MarkingOverviewSignalBand
        v-else-if="overview"
        :filter-context="overview.filterContext"
        :signal-metrics="overview.signalMetrics"
        :marking-progress-summary="overview.markingProgressSummary"
        :placeholder="false"
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <UiEmpty
      v-if="loadFailed"
      description="阅卷概览加载失败"
      action-label="重试"
      @action="() => load()"
    />

    <div v-else class="marking-overview__content">
      <div class="marking-overview__content-grid">
        <section class="marking-overview__main">
          <WorkbenchSurfaceCard class="marking-overview__panel">
            <template #head>
              <div class="marking-overview__panel-head">
                <h3 class="marking-overview__panel-title">进行中的考试</h3>
                <UiButton variant="outline" size="sm" @click="goExamList">查看全部</UiButton>
              </div>
            </template>
            <div
              class="marking-overview__panel-body"
              :class="{ 'marking-overview__panel-body--empty': !examsLoading && !hasOngoingExams }"
            >
              <UiSkeletonState v-if="examsLoading" variant="card" :card-count="3" compact />
              <OngoingExamCardGrid
                v-else
                :exams="overview?.ongoingExams ?? []"
                @navigate="goExamWorkspace"
              />
            </div>
          </WorkbenchSurfaceCard>
        </section>
        <aside class="marking-overview__side">
          <WorkbenchSurfaceCard
            class="marking-overview__panel marking-overview__panel--todos"
            :flush="hasPendingTodos"
          >
            <template #head>
              <div class="marking-overview__panel-head">
                <div class="marking-overview__panel-head-main">
                  <h3 class="marking-overview__panel-title">待处理事项</h3>
                  <p v-if="hasPendingTodos" class="marking-overview__panel-desc">
                    {{ pendingTodoHint }}
                  </p>
                </div>
                <UiButton
                  v-if="hasPendingTodos"
                  variant="ghost"
                  size="sm"
                  @click="goPriorityExamList"
                >
                  查看优先推进
                </UiButton>
              </div>
            </template>
            <div
              class="marking-overview__panel-body"
              :class="{ 'marking-overview__panel-body--empty': !todosLoading && !hasPendingTodos }"
            >
              <UiSkeletonState v-if="todosLoading" variant="list" :rows="5" compact />
              <template v-else>
                <UiSectionTabs
                  v-if="hasPendingTodos"
                  v-model="pendingTodoTabKey"
                  :items="pendingTodoTabItems"
                  compact
                  class="marking-overview__todo-tabs"
                />
                <PendingTodoFeed
                  :todos="filteredPendingTodos"
                  :empty-description="pendingTodoEmptyDescription"
                  @navigate="goExamWorkspace"
                />
              </template>
            </div>
          </WorkbenchSurfaceCard>
        </aside>
      </div>

      <a-row :gutter="20" class="marking-overview__analytics-row">
        <a-col :span="24">
          <UiSkeletonState v-if="examsLoading" variant="card" :card-count="3" compact />
          <MarkingOverviewAnalytics
            v-else
            :journey-stage-summary="overview?.journeyStageSummary ?? []"
            :marking-progress-summary="
              overview?.markingProgressSummary ?? emptyMarkingProgressSummary
            "
            :todo-type-summary="overview?.todoTypeSummary ?? []"
            :filtered-exam-count="overview?.filterContext.filteredExamCount ?? 0"
          />
        </a-col>
      </a-row>

      <a-row :gutter="20" class="marking-overview__bottom-row">
        <a-col :span="24">
          <WorkbenchSurfaceCard class="marking-overview__panel">
            <template #head>
              <div class="marking-overview__panel-head">
                <h3 class="marking-overview__panel-title">已发布学情</h3>
              </div>
            </template>
            <UiSkeletonState v-if="examsLoading" variant="table" :rows="4" :columns="5" compact />
            <div v-else class="marking-overview__insight-grid">
              <section class="marking-overview__insight-slot">
                <PublishedExamInsightChart :insights="overview?.publishedExamInsights ?? []" />
              </section>
              <section class="marking-overview__insight-slot">
                <PublishedExamInsightTable
                  :insights="overview?.publishedExamInsights ?? []"
                  @statistics="goArchiveStatistics"
                />
              </section>
            </div>
          </WorkbenchSurfaceCard>
        </a-col>
      </a-row>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardOverviewVO,
  MarkTeacherDashboardQuery,
} from '@/apis/mark/teacher-dashboard'
import type { MarkDashboardPendingTodoTabKey } from '@/utils/mark-dashboard-todo'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_FILTER_OPTIONS, ExamStatusCode } from '@/apis/mark/exam'
import {
  loadTeacherDashboardOverviewOnce,
  loadTeacherDashboardOverviewSilent,
} from '@/apis/mark/teacher-dashboard'
import MarkingOverviewAnalytics from '@/components/mark/dashboard/MarkingOverviewAnalytics.vue'
import MarkingOverviewSignalBand from '@/components/mark/dashboard/MarkingOverviewSignalBand.vue'
import MarkingOverviewStageRail from '@/components/mark/dashboard/MarkingOverviewStageRail.vue'
import OngoingExamCardGrid from '@/components/mark/dashboard/OngoingExamCardGrid.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import PublishedExamInsightChart from '@/components/mark/dashboard/PublishedExamInsightChart.vue'
import PublishedExamInsightTable from '@/components/mark/dashboard/PublishedExamInsightTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
  resolveDefaultDashboardFilter,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
import { buildExamListRoute } from '@/utils/exam-list-navigation'
import {
  buildPendingTodoHint,
  buildPendingTodoTabItems,
  filterPendingTodosByTab,
  resolveDefaultPendingTodoTab,
} from '@/utils/mark-dashboard-todo'

defineOptions({ name: 'TeacherMarkingOverview' })

const router = useRouter()

const signalLoading = ref(false)
const examsLoading = ref(false)
const todosLoading = ref(false)
const loadFailed = ref(false)
computed(
  () => signalLoading.value || examsLoading.value || todosLoading.value,
)
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
  status: ExamStatusCode.ACTIVE,
})
const committedFilter = ref<MarkTeacherDashboardQuery>({ ...filter.value })

const academicYearOptions = computed(() => {
  const apiYears = overview.value?.filterOptions.academicYears
  const years = apiYears?.length ? apiYears : generateAcademicYearOptions()
  return years.map((year) => ({ label: year, value: year }))
})
const semesterOptions = computed(() => {
  const apiSemesters = overview.value?.filterOptions.semesters
  const codes = apiSemesters?.length ? apiSemesters : SemesterOptions.map((item) => item.value)
  return codes.map((code) => ({
    label: formatSemester(code),
    value: code,
  }))
})
const statusOptions = EXAM_STATUS_FILTER_OPTIONS

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

const hasOngoingExams = computed(() => (overview.value?.ongoingExams.length ?? 0) > 0)
const pendingTodos = computed(() => overview.value?.pendingTodos ?? [])
const hasPendingTodos = computed(() => pendingTodos.value.length > 0)
const pendingTodoTabKey = ref<MarkDashboardPendingTodoTabKey>('all')
const pendingTodoTabItems = computed(() => buildPendingTodoTabItems(pendingTodos.value))
const filteredPendingTodos = computed(() =>
  filterPendingTodosByTab(pendingTodos.value, pendingTodoTabKey.value),
)
const pendingTodoHint = computed(() => buildPendingTodoHint(pendingTodos.value))
const pendingTodoEmptyDescription = computed(() => {
  if (!hasPendingTodos.value) return '当前筛选范围内无阻断事项'
  if (pendingTodoTabKey.value === 'urgent') return '当前筛选下暂无紧急待办'
  if (pendingTodoTabKey.value === 'attention') return '当前筛选下暂无需关注待办'
  return '当前筛选下暂无待处理事项'
})

watch(
  pendingTodos,
  (todos) => {
    if (!todos.length) {
      pendingTodoTabKey.value = 'all'
      return
    }
    const currentItems = filterPendingTodosByTab(todos, pendingTodoTabKey.value)
    if (currentItems.length === 0) {
      pendingTodoTabKey.value = resolveDefaultPendingTodoTab(todos)
    }
  },
  { immediate: true },
)

function isFilterRangeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('不在可选范围内')
}

function applyOverview(data: MarkTeacherDashboardOverviewVO) {
  overview.value = data
  filter.value = {
    academicYear: data.filterContext.academicYear ?? filter.value.academicYear,
    semester: data.filterContext.semester ?? filter.value.semester,
    status: data.filterContext.status ?? filter.value.status ?? ExamStatusCode.ACTIVE,
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
  try {
    return await loadTeacherDashboardOverviewOnce({ ...query })
  } catch (error) {
    if (isFilterRangeError(error) && (query.academicYear || query.semester)) {
      const bootstrap = await loadTeacherDashboardOverviewSilent({})
      const reconciled = resolveDefaultDashboardFilter(bootstrap.filterOptions)
      filter.value = {
        ...filter.value,
        academicYear: reconciled.academicYear,
        semester: reconciled.semester,
      }
      return await loadTeacherDashboardOverviewOnce({ ...filter.value })
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
    applyOverview(data)
  } finally {
    todosLoading.value = false
  }
}

async function load(options?: { rollbackFilterOnError?: boolean }) {
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
  loadFailed.value = false
  try {
    await Promise.all([
      loadSignalSection(query, options),
      loadExamsSection(query, options),
      loadTodosSection(query, options),
    ])
    committedFilter.value = { ...filter.value }
  } catch (error) {
    overview.value = null
    loadFailed.value = true
    showUserError(error, '阅卷概览加载失败')
  }
}

function handleFilterChange() {
  if (!filter.value.academicYear) {
    filter.value.semester = undefined
  }
  if (!ensureAcademicYearSemesterPair(filter.value.academicYear, filter.value.semester)) {
    return
  }
  void load({ rollbackFilterOnError: true })
}

function goExamList() {
  void router.push({ name: 'TeacherExamList' })
}

function handleSignalMetricClick(key: string): void {
  if (key === 'active' || key === 'unpublished') {
    void router.push(
      buildExamListRoute({
        tab: 'ongoing',
        academicYear: filter.value.academicYear,
        semester: filter.value.semester,
        status: filter.value.status,
      }),
    )
    return
  }
  if (key === 'exceptions' || key === 'arbitration' || key === 'spot-check') {
    goPriorityExamList()
  }
}

/** 待处理事项深链：携带当前学年学期筛选，打开考试列表「优先推进」Tab。 */
function goPriorityExamList() {
  void router.push(
    buildExamListRoute({
      tab: 'priority',
      academicYear: filter.value.academicYear,
      semester: filter.value.semester,
      status: filter.value.status,
    }),
  )
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
.marking-overview__content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.marking-overview__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--dp-space-5);
  align-items: stretch;
  margin-bottom: var(--dp-space-5);
}

.marking-overview__main,
.marking-overview__side {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.marking-overview__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 360px;
  height: 100%;
}

.marking-overview__panel :deep(.workbench-surface-card__head) {
  width: 100%;
}

.marking-overview__panel :deep(.workbench-surface-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.marking-overview__panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.marking-overview__panel-body--empty {
  justify-content: center;
  min-height: 240px;
}

.marking-overview__panel--todos :deep(.workbench-surface-card__body--flush) {
  padding: 0;
}

.marking-overview__panel-head-main {
  min-width: 0;
}

.marking-overview__todo-tabs {
  padding: 0 var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
}

.marking-overview__todo-tabs :deep(.ui-section-tabs__head) {
  margin-bottom: 0;
}

.marking-overview__todo-tabs :deep(.ui-section-tabs__helper) {
  margin-bottom: var(--dp-space-2);
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

.marking-overview__insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-5);
}

.marking-overview__insight-slot {
  min-height: 260px;
  padding: var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

@media (max-width: 1199px) {
  .marking-overview__insight-grid {
    grid-template-columns: 1fr;
  }
}

.marking-overview__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.marking-overview__panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--dp-font-weight-title, 600);
  line-height: 1.5;
}

.marking-overview__panel-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary, #475569);
  line-height: 1.5;
}
</style>
