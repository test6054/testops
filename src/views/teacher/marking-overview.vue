<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="阅卷概览"
      >
        <template #toolbar>
          <div class="marking-overview__scope" role="group" aria-label="概览范围筛选">
            <div class="marking-overview__scope-item">
              <UiSelect
                size="sm"
                v-model="filter.academicYear"
                :options="academicYearOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.academicYear"
                :loading="filterRefreshing"
                allow-clear
                @change="handleFilterChange"
              />
            </div>
            <div class="marking-overview__scope-item">
              <UiSelect
                size="sm"
                v-model="filter.semester"
                :options="semesterOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.semester"
                :loading="filterRefreshing"
                allow-clear
                :disabled="!filter.academicYear"
                @change="handleFilterChange"
              />
            </div>
            <div class="marking-overview__scope-item marking-overview__scope-item--status">
              <UiSelect
                size="sm"
                v-model="filter.status"
                :options="statusOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.status"
                :loading="filterRefreshing"
                allow-clear
                @change="handleFilterChange"
              />
            </div>
            <UiSpin v-if="filterRefreshing" size="sm" class="marking-overview__filter-spin" />
          </div>
        </template>
        <template #actions>
          <UiButton
            v-if="hasPendingTodos"
            variant="primary"
            size="sm"
            @click="goPriorityExamList"
          >
            处理待办
          </UiButton>
          <UiButton
            :variant="hasPendingTodos ? 'outline' : 'primary'"
            size="sm"
            @click="goExamList"
          >
            考试列表
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #rail>
      <UiSkeletonState
        v-if="signalLoading && !overview && !signalLoadFailed"
        class="marking-overview__rail-skeleton"
        variant="list"
        :rows="2"
        compact
      />
      <UiSpin
        v-else
        :spinning="examsLoading && !!overview"
        wrapper-class-name="marking-overview__rail-spin"
      >
        <div class="marking-overview__stage-rail">
          <div class="marking-overview__stage-rail-head">
            <div class="marking-overview__stage-rail-head-main">
              <span class="marking-overview__stage-rail-title">考试旅程</span>
              <span class="marking-overview__stage-rail-hint">点击阶段筛选进行中考试</span>
            </div>
            <UiButton
              v-if="selectedJourneyKey"
              variant="outline"
              size="sm"
              class="marking-overview__stage-rail-clear"
              @click="clearJourneyStageFilter"
            >
              清除筛选
            </UiButton>
          </div>
          <StageRail
            :stages="dashboardStages"
            :active-key="journeyRailActiveKey"
            variant="panel"
            compact
            class="marking-overview__stage-rail-timeline"
            @select="handleJourneyStageSelect"
          />
        </div>
      </UiSpin>
    </template>

    <template #signal>
      <UiSkeletonState
        v-if="signalLoading && !overview && !signalLoadFailed"
        variant="card"
        :card-count="1"
        compact
      />
      <SignalBand
        v-else
        :metrics="dashboardSignals"
        compact
        variant="panel"
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <div
      class="marking-overview__content"
      :class="{ 'marking-overview__content--todo-focus': showTodoFocusLayout }"
    >
      <UiRow :gutter="20" class="marking-overview__analytics-row">
        <UiCol :span="24">
          <UiSkeletonState
            v-if="signalLoading && !overview && !signalLoadFailed"
            variant="card"
            :card-count="3"
            compact
          />
          <MarkingOverviewAnalytics
            v-else
            :loading="examsLoading && !!overview"
            :journey-stage-summary="overview?.journeyStageSummary ?? []"
            :todo-type-summary="overview?.todoTypeSummary ?? []"
            :daily-progress-trend="overview?.dailyProgressTrend ?? []"
            :filtered-exam-count="overview?.filterContext.filteredExamCount ?? 0"
          />
        </UiCol>
      </UiRow>

      <div class="marking-overview__content-grid">
        <section class="marking-overview__main">
          <WorkbenchSurfaceCard class="marking-overview__panel marking-overview__panel--exams">
            <template #head>
              <div class="marking-overview__panel-head">
                <div class="marking-overview__panel-head-main">
                  <h3 class="marking-overview__panel-title">进行中的考试</h3>
                  <p v-if="journeyFilterHint" class="marking-overview__panel-desc">
                    {{ journeyFilterHint }}
                  </p>
                </div>
                <UiButton variant="outline" size="sm" @click="goExamList">查看全部</UiButton>
              </div>
            </template>
            <div
              class="marking-overview__panel-body"
              :class="{ 'marking-overview__panel-body--empty': panelShowsEmptyState('exams') }"
            >
              <UiSkeletonState
                v-if="signalLoading && !overview && !signalLoadFailed"
                variant="card"
                :card-count="3"
                compact
              />
              <UiEmpty
                v-else-if="signalLoadFailed && !overview"
                size="sm"
                title="加载失败"
              />
              <UiSkeletonState v-else-if="examsPanelLoading" variant="card" :card-count="3" compact />
              <UiEmpty
                size="sm"
                v-else-if="examsLoadFailed"
                title="加载失败"
              />
              <template v-else>
                <OngoingExamCardGrid
                  :exams="displayedOngoingExamItems"
                  @navigate="goExamWorkspace"
                />
                <UiEmpty
                  v-if="selectedJourneyKey && displayedOngoingExamItems.length === 0"
                  size="sm"
                  description="当前页无该阶段考试，可翻页或清除阶段筛选"
                />
                <UiPagination
                  v-if="ongoingExamPage.total > ongoingExamPage.pageSize"
                  v-model:current="ongoingExamPageNum"
                  v-model:page-size="ongoingExamPageSize"
                  class="marking-overview__panel-pagination"
                  :total="ongoingExamPage.total"
                  :show-size-changer="false"
                  @change="handleOngoingExamPageChange"
                />
              </template>
            </div>
          </WorkbenchSurfaceCard>
        </section>
        <aside class="marking-overview__side">
          <WorkbenchSurfaceCard
            class="marking-overview__panel marking-overview__panel--todos"
            :class="pendingTodoFocusClass"
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
                  variant="outline"
                  size="sm"
                  @click="goPriorityExamList"
                >
                  查看优先推进
                </UiButton>
              </div>
            </template>
            <div
              class="marking-overview__panel-body"
              :class="{ 'marking-overview__panel-body--empty': panelShowsEmptyState('todos') }"
            >
              <UiSkeletonState
                v-if="signalLoading && !overview && !signalLoadFailed"
                variant="list"
                :rows="5"
                compact
              />
              <UiEmpty
                size="sm"
                v-else-if="signalLoadFailed && !overview"
                title="加载失败"
              />
              <UiSkeletonState v-else-if="todosPanelLoading" variant="list" :rows="5" compact />
              <UiEmpty
                size="sm"
                v-else-if="todosLoadFailed"
                title="加载失败"
              />
              <template v-else>
                <UiSectionTabs
                  v-if="hasPendingTodos"
                  v-model="pendingTodoTabKey"
                  :items="pendingTodoTabItems"
                  compact
                  class="marking-overview__todo-tabs"
                />
                <PendingTodoFeed
                  :todos="pendingTodoItems"
                  :empty-description="pendingTodoEmptyDescription"
                  @navigate="goExamWorkspace"
                />
                <UiPagination
                  v-if="pendingTodoPage.total > pendingTodoPage.pageSize"
                  v-model:current="pendingTodoPageNum"
                  v-model:page-size="pendingTodoPageSize"
                  class="marking-overview__panel-pagination"
                  :total="pendingTodoPage.total"
                  :show-size-changer="false"
                  @change="handlePendingTodoPageChange"
                />
              </template>
            </div>
          </WorkbenchSurfaceCard>
        </aside>
      </div>

      <UiRow :gutter="20" class="marking-overview__bottom-row">
        <UiCol :span="24">
          <WorkbenchSurfaceCard class="marking-overview__panel marking-overview__panel--secondary">
            <template #head>
              <div class="marking-overview__panel-head">
                <h3 class="marking-overview__panel-title">已发布学情</h3>
              </div>
            </template>
            <UiSkeletonState
              v-if="signalLoading && !overview && !signalLoadFailed"
              variant="table"
              :rows="4"
              :columns="5"
              compact
            />
            <UiEmpty
              size="sm"
              v-else-if="signalLoadFailed && !overview"
              title="加载失败"
              class="marking-overview__insight-empty"
            />
            <UiSkeletonState v-else-if="examsLoading && !overview" variant="table" :rows="4" :columns="5" compact />
            <UiEmpty
              size="sm"
              v-else-if="!hasPublishedExamInsights"
              description="当前筛选范围内暂无已发布学情"
              class="marking-overview__insight-empty"
            />
            <div v-else class="marking-overview__insight-grid">
              <section class="marking-overview__insight-slot">
                <PublishedExamInsightChart :insights="publishedExamInsights" />
              </section>
              <section class="marking-overview__insight-slot">
                <PublishedExamInsightTable
                  :insights="publishedExamInsights"
                  @statistics="goArchiveStatistics"
                />
              </section>
            </div>
          </WorkbenchSurfaceCard>
        </UiCol>
      </UiRow>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import type { WorkbenchStage } from '@/types/workbench'
import type { MarkDashboardPendingTodoTabKey } from '@/utils/mark-dashboard-todo'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkingOverviewAnalytics from '@/components/mark/dashboard/MarkingOverviewAnalytics.vue'
import OngoingExamCardGrid from '@/components/mark/dashboard/OngoingExamCardGrid.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import PublishedExamInsightChart from '@/components/mark/dashboard/PublishedExamInsightChart.vue'
import PublishedExamInsightTable from '@/components/mark/dashboard/PublishedExamInsightTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkingOverviewSignals } from '@/composables/useMarkingOverviewSignals'
import { useMarkingOverviewStages } from '@/composables/useMarkingOverviewStages'
import { useMarkTeacherDashboardOverview } from '@/composables/useMarkTeacherDashboardOverview'
import { EXAM_JOURNEY_STEPS, resolveJourneyKeyByStage } from '@/constants/exam-journey'
import { buildExamListRoute } from '@/utils/exam-list-navigation'
import { MARK_DASHBOARD_FILTER_PLACEHOLDERS } from '@/utils/mark-dashboard-filter-options'
import {
  buildPendingTodoHint,
  buildPendingTodoTabItems,
  resolvePendingTodoFocusTone,
  resolvePendingTodoScopeByTab,
} from '@/utils/mark-dashboard-todo'

defineOptions({ name: 'TeacherMarkingOverview' })

const router = useRouter()

const {
  overview,
  filter,
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
  load,
  loadOngoingExamPage,
  loadPendingTodoPage,
  handleFilterChange,
  suppressTodoTabReload,
} = useMarkTeacherDashboardOverview()

const { metrics: dashboardSignals } = useMarkingOverviewSignals({
  filterContext: computed(() => overview.value?.filterContext),
  signalMetrics: computed(() => overview.value?.signalMetrics),
  markingProgressSummary: computed(() => overview.value?.markingProgressSummary),
  dailyProgressTrend: computed(() => overview.value?.dailyProgressTrend),
  placeholder: computed(() => !overview.value),
})

const {
  stages: dashboardStages,
  activeStageKey: bottleneckStageKey,
} = useMarkingOverviewStages({
  exams: computed(() => ongoingExamItems.value),
  journeyStageSummary: computed(() => overview.value?.journeyStageSummary ?? []),
})

/** 旅程轨点击筛选：与当前页进行中考试客户端对齐 */
const selectedJourneyKey = ref<MarkTeacherDashboardJourneyKeyCode | ''>('')

const emptyOngoingExamPage = {
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 4,
  pages: 0,
}
const emptyPendingTodoPage = {
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 5,
  pages: 0,
}

const ongoingExamPage = computed(() => overview.value?.ongoingExamPage ?? emptyOngoingExamPage)
const ongoingExamItems = computed(() => ongoingExamPage.value.list)
const pendingTodoPage = computed(() => overview.value?.pendingTodoPage ?? emptyPendingTodoPage)
const pendingTodoItems = computed(() => pendingTodoPage.value.list)

const journeyRailActiveKey = computed(() => selectedJourneyKey.value || bottleneckStageKey.value)

const displayedOngoingExamItems = computed(() => {
  const key = selectedJourneyKey.value
  if (!key) {
    return ongoingExamItems.value
  }
  return ongoingExamItems.value.filter((exam) => {
    const stageKey = exam.currentStageKey
    if (
      stageKey !== 'EXAM_PREP'
      && stageKey !== 'PAPER_TEMPLATE'
      && stageKey !== 'CANDIDATE_ROSTER'
      && stageKey !== 'SCAN'
      && stageKey !== 'MARKING_ORG'
      && stageKey !== 'TRIAL_MARKING'
      && stageKey !== 'FORMAL_MARKING'
      && stageKey !== 'SCORE_PUBLISH'
      && stageKey !== 'ARCHIVE'
    ) {
      return false
    }
    return resolveJourneyKeyByStage(stageKey) === key
  })
})

const journeyFilterHint = computed(() => {
  if (!selectedJourneyKey.value) {
    return ''
  }
  const step = EXAM_JOURNEY_STEPS.find((item) => item.key === selectedJourneyKey.value)
  const title = step?.title ?? selectedJourneyKey.value
  const count = displayedOngoingExamItems.value.length
  return `已筛「${title}」· 当前页 ${count} 场`
})

const filteredExamCount = computed(() => overview.value?.filterContext.filteredExamCount ?? 0)


const examsPanelLoading = computed(() => {
  if (signalLoading.value && !overview.value) return true
  if (examsLoading.value && !!overview.value) return true
  return filteredExamCount.value > 0
    && ongoingExamPage.value.total === 0
    && !examsLoadFailed.value
    && !!overview.value
})

const todosPanelLoading = computed(() => {
  if (signalLoading.value && !overview.value) return true
  if (todosLoading.value && !!overview.value) return true
  const pendingTodoRowCount = overview.value?.signalMetrics?.pendingTodoRowCount ?? 0
  return pendingTodoRowCount > 0
    && pendingTodoPage.value.total === 0
    && !todosLoadFailed.value
    && !!overview.value
})

const hasOngoingExams = computed(() =>
  filteredExamCount.value > 0 || ongoingExamPage.value.total > 0,
)
const hasPublishedExamInsights = computed(
  () => (overview.value?.publishedExamInsights.length ?? 0) > 0,
)
const publishedExamInsights = computed(() => overview.value?.publishedExamInsights ?? [])
const hasPendingTodos = computed(
  () => (overview.value?.signalMetrics?.pendingTodoRowCount ?? 0) > 0,
)

const showTodoFocusLayout = computed(
  () => !signalLoadFailed.value && (hasPendingTodos.value || (todosLoading.value && !!overview.value)),
)
const pendingTodoFocusTone = computed(() => resolvePendingTodoFocusTone(pendingTodoItems.value))
const pendingTodoFocusClass = computed(() =>
  pendingTodoFocusTone.value
    ? `marking-overview__panel--focus-${pendingTodoFocusTone.value}`
    : undefined,
)
const pendingTodoTabKey = ref<MarkDashboardPendingTodoTabKey>('all')
const pendingTodoTotals = computed(() => {
  const metrics = overview.value?.signalMetrics
  if (!metrics) return undefined
  return {
    pendingTodoRowCount: metrics.pendingTodoRowCount,
    urgentTodoCount: metrics.urgentTodoCount,
    attentionTodoCount: metrics.attentionTodoCount,
  }
})
const pendingTodoTabItems = computed(() =>
  buildPendingTodoTabItems(pendingTodoItems.value, pendingTodoTotals.value),
)
const pendingTodoHint = computed(() =>
  buildPendingTodoHint(pendingTodoItems.value, pendingTodoTotals.value),
)
const pendingTodoEmptyDescription = computed(() => {
  if (!hasPendingTodos.value) return '当前筛选范围内无阻断事项'
  if (pendingTodoTabKey.value === 'urgent') return '当前筛选下暂无紧急待办'
  if (pendingTodoTabKey.value === 'attention') return '当前筛选下暂无需关注待办'
  return '当前筛选下暂无待处理事项'
})

function panelShowsEmptyState(panel: 'exams' | 'todos'): boolean {
  if (signalLoadFailed.value && !overview.value) {
    return true
  }
  if (panel === 'exams') {
    return !examsLoading.value && !examsLoadFailed.value && !hasOngoingExams.value
  }
  return !todosLoading.value && !todosLoadFailed.value && !hasPendingTodos.value
}

watch(pendingTodoTabKey, (tab, previousTab) => {
  if (tab === previousTab || !overview.value || suppressTodoTabReload.value) {
    return
  }
  void loadPendingTodoPage(1, { todoScope: resolvePendingTodoScopeByTab(tab) })
})

watch(
  () => pendingTodoTotals.value,
  (totals) => {
    if (!totals || totals.pendingTodoRowCount <= 0) {
      pendingTodoTabKey.value = 'all'
      return
    }
    const tabItems = buildPendingTodoTabItems([], totals)
    const currentTab = tabItems.find((item) => item.key === pendingTodoTabKey.value)
    if (currentTab?.disabled) {
      pendingTodoTabKey.value = totals.urgentTodoCount > 0
        ? 'urgent'
        : totals.attentionTodoCount > 0
          ? 'attention'
          : 'all'
    }
  },
  { immediate: true },
)

function handleOngoingExamPageChange(pageNum: number, pageSize: number): void {
  void loadOngoingExamPage(pageNum, pageSize)
}

function handlePendingTodoPageChange(pageNum: number, pageSize: number): void {
  void loadPendingTodoPage(pageNum, {
    pageSize,
    todoScope: resolvePendingTodoScopeByTab(pendingTodoTabKey.value),
  })
}

function goExamList() {
  void router.push({ name: 'TeacherExamList' })
}

function handleJourneyStageSelect(stage: WorkbenchStage): void {
  const key = stage.key as MarkTeacherDashboardJourneyKeyCode
  selectedJourneyKey.value = selectedJourneyKey.value === key ? '' : key
}

function clearJourneyStageFilter(): void {
  selectedJourneyKey.value = ''
}

function handleSignalMetricClick(key: string): void {
  if (key === 'active' || key === 'unpublished' || key === 'scan-attention' || key === 'marking-progress') {
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

watch(
  () => [filter.value.academicYear, filter.value.semester, filter.value.status],
  () => {
    selectedJourneyKey.value = ''
  },
)

onMounted(() => {
  void load()
})
</script>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

/* 范围筛选：宿主格定宽 + 单行 nowrap；UiSelect 内部 100% 填满格 */
.marking-overview__scope {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--dp-space-2);
  min-width: 0;
  max-width: 100%;
  min-height: var(--dp-control-height-sm, 28px);
}

.marking-overview__scope-item {
  flex: 0 0 132px;
  width: 132px;
  min-width: 132px;
  max-width: 132px;
}

.marking-overview__scope-item--status {
  flex-basis: 112px;
  width: 112px;
  min-width: 112px;
  max-width: 112px;
}

.marking-overview__scope-item :deep(.ui-select) {
  width: 100%;
  max-width: 100%;
  vertical-align: middle;
}

.marking-overview__scope-item :deep(.ant-select),
.marking-overview__scope-item :deep(.ant-select-selector) {
  height: var(--dp-control-height-sm, 32px) !important;
  min-height: var(--dp-control-height-sm, 32px) !important;
  align-items: center;
  background-color: var(--dp-surface) !important;
}

.marking-overview__scope-item :deep(.ant-select-selection-item),
.marking-overview__scope-item :deep(.ant-select-selection-placeholder) {
  line-height: calc(var(--dp-control-height-sm, 32px) - 2px) !important;
}


.marking-overview__filter-spin {
  flex-shrink: 0;
  line-height: 1;
}

.marking-overview__rail-skeleton {
  width: 100%;
}

:deep(.marking-overview__rail-spin) {
  display: block;
  width: 100%;
}

:deep(.marking-overview__signal-spin) {
  display: block;
  width: 100%;
  min-height: var(--dp-control-height-lg);
}

.marking-overview__stage-rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-1);
  min-height: 28px;
}

.marking-overview__stage-rail-head-main {
  display: flex;
  align-items: baseline;
  gap: var(--dp-space-2);
  min-width: 0;
}

.marking-overview__stage-rail-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dp-text-primary);
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.marking-overview__stage-rail-hint {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
  white-space: nowrap;
}

.marking-overview__stage-rail-clear {
  flex-shrink: 0;
}

.marking-overview__stage-rail-timeline {
  width: 100%;
}

/* 考试旅程：沿用 StageRail 原 panel，仅保证满宽；不改造成 chip 条 */
.marking-overview__stage-rail-timeline :deep(.stage-rail-panel) {
  width: 100%;
}

.marking-overview__panel-head-main {
  min-width: 0;
}

.marking-overview__panel-desc {
  margin: var(--dp-space-1) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .marking-overview__scope {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .marking-overview__scope-item {
    flex: 0 0 120px;
    width: 120px;
    min-width: 120px;
    max-width: 120px;
  }

  .marking-overview__scope-item--status {
    flex-basis: 100px;
    width: 100px;
    min-width: 100px;
    max-width: 100px;
  }
}


.marking-overview__content {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.marking-overview__analytics-row {
  margin: 0;
}

.marking-overview__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--dp-space-4);
  align-items: stretch;
  margin-bottom: 0;
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .marking-overview__content-grid {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .marking-overview__content-grid {
    grid-template-columns: 1fr;
  }
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
  min-height: 120px;
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

.marking-overview__panel-pagination {
  margin-top: var(--dp-space-4);
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border);
  display: flex;
  justify-content: flex-end;
}

.marking-overview__panel-body--empty {
  justify-content: center;
  min-height: 88px;
}

.marking-overview__panel--todos :deep(.workbench-surface-card__body--flush) {
  padding: 0;
}

.marking-overview__panel--focus-urgent:deep(.workbench-surface-card) {
  background: var(--dp-red-50);
  border-color: var(--dp-red-200);
  box-shadow: var(--dp-shadow-md);
}

.marking-overview__panel--focus-urgent:deep(.workbench-surface-card__head) {
  border-bottom-color: var(--dp-red-200);
}

.marking-overview__panel--focus-attention:deep(.workbench-surface-card),
.marking-overview__panel--focus-pending:deep(.workbench-surface-card) {
  background: var(--dp-orange-50);
  border-color: var(--dp-orange-200);
  box-shadow: var(--dp-shadow-md);
}

.marking-overview__panel--focus-attention:deep(.workbench-surface-card__head),
.marking-overview__panel--focus-pending:deep(.workbench-surface-card__head) {
  border-bottom-color: var(--dp-orange-200);
}

.marking-overview__panel--focus-urgent .marking-overview__panel-title {
  color: var(--dp-red-700);
  font-weight: var(--dp-font-weight-title);
}

.marking-overview__panel--focus-urgent .marking-overview__panel-desc {
  color: var(--dp-red-600);
}

.marking-overview__panel--focus-attention .marking-overview__panel-title,
.marking-overview__panel--focus-pending .marking-overview__panel-title {
  color: var(--dp-orange-700);
  font-weight: var(--dp-font-weight-title);
}

.marking-overview__content--todo-focus
  .marking-overview__panel--exams:deep(.workbench-surface-card),
.marking-overview__content--todo-focus
  .marking-overview__panel--secondary:deep(.workbench-surface-card) {
  background: var(--dp-surface);
  border-color: var(--dp-border);
  box-shadow: none;
}

.marking-overview__content--todo-focus .marking-overview__analytics-row:deep(.ui-card) {
  box-shadow: none;
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
  margin-bottom: var(--dp-space-3);
}

.marking-overview__bottom-row {
  margin-top: 0;
}

.marking-overview__insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-3);
}

.marking-overview__insight-empty {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: bp.$layout-mobile-max) {
  .marking-overview__insight-grid {
    grid-template-columns: 1fr;
  }
}

.marking-overview__insight-slot {
  min-height: 120px;
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-surface-subtle);
}

.marking-overview__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  width: 100%;
}

.marking-overview__panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
  text-transform: none;
}

.marking-overview__panel-desc {
  margin: var(--dp-space-1) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}
</style>
