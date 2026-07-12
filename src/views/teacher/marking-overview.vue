<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="阅卷概览" :subtitle="pageSubtitle">
        <template #status>
          <a-select
            v-model:value="filter.academicYear"
            :options="academicYearOptions"
            class="context-bar__filter-select"
            :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.academicYear"
            :loading="filterRefreshing"
            allow-clear
            @change="handleFilterChange"
          />
          <a-select
            v-model:value="filter.semester"
            :options="semesterOptions"
            class="context-bar__filter-select"
            :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.semester"
            :loading="filterRefreshing"
            allow-clear
            :disabled="!filter.academicYear"
            @change="handleFilterChange"
          />
          <a-select
            v-model:value="filter.status"
            :options="statusOptions"
            class="context-bar__filter-select"
            :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.status"
            :loading="filterRefreshing"
            allow-clear
            @change="handleFilterChange"
          />
          <a-spin v-if="filterRefreshing" size="small" class="marking-overview__filter-spin" />
        </template>
        <template #actions>
          <UiButton size="sm" @click="goExamList"> 查看全部考试 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #rail>
      <UiSkeletonState
        v-if="examsLoading && !overview"
        class="marking-overview__rail-skeleton"
        variant="list"
        :rows="2"
        compact
      />
      <a-spin
        v-else-if="overview"
        :spinning="examsLoading"
        wrapper-class-name="marking-overview__rail-spin"
      >
        <div class="marking-overview__stage-rail">
          <div class="marking-overview__stage-rail-head">
            <span class="marking-overview__stage-rail-title">考试旅程</span>
          </div>
          <div v-if="dashboardJourneyHint" class="marking-overview__stage-rail-hint">
            <span class="marking-overview__stage-rail-hint-text">{{ dashboardJourneyHint }}</span>
            <UiButton size="sm" variant="outline" @click="goPriorityExamList">
              查看优先推进
            </UiButton>
          </div>
          <StageRail
            :stages="dashboardStages"
            :active-key="dashboardActiveStageKey"
            variant="panel"
            compact
            class="marking-overview__stage-rail-timeline"
          />
        </div>
      </a-spin>
    </template>

    <template #signal>
      <UiSkeletonState v-if="signalLoading && !overview" variant="card" :card-count="4" compact />
      <a-spin
        v-else-if="overview"
        :spinning="signalLoading"
        wrapper-class-name="marking-overview__signal-spin"
      >
        <SignalBand
          :metrics="dashboardSignals"
          compact
          variant="tiles"
          @metric-click="handleSignalMetricClick"
        />
      </a-spin>
    </template>

    <UiEmpty
      v-if="signalLoadFailed && !overview"
      description="阅卷概览加载失败"
      action-label="重试"
      @action="() => load()"
    />

    <div
      v-else
      class="marking-overview__content"
      :class="{ 'marking-overview__content--todo-focus': showTodoFocusLayout }"
    >
      <div
        class="marking-overview__content-grid"
        :class="{ 'marking-overview__content-grid--todo-focus': showTodoFocusLayout }"
      >
        <section class="marking-overview__main">
          <WorkbenchSurfaceCard class="marking-overview__panel marking-overview__panel--exams">
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
              <UiEmpty
                v-else-if="examsLoadFailed"
                description="进行中考试加载失败"
                action-label="重试"
                @action="() => load()"
              />
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
              <UiEmpty
                v-else-if="todosLoadFailed"
                description="待处理事项加载失败"
                action-label="重试"
                @action="() => load()"
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
          <UiSkeletonState
            v-if="examsLoading && !overview"
            variant="card"
            :card-count="3"
            compact
          />
          <MarkingOverviewAnalytics
            v-else-if="overview"
            :loading="examsLoading"
            :journey-stage-summary="overview.journeyStageSummary"
            :marking-progress-summary="overview.markingProgressSummary"
            :todo-type-summary="overview.todoTypeSummary"
            :filtered-exam-count="overview.filterContext.filteredExamCount"
          />
        </a-col>
      </a-row>

      <a-row :gutter="20" class="marking-overview__bottom-row">
        <a-col :span="24">
          <WorkbenchSurfaceCard class="marking-overview__panel marking-overview__panel--secondary">
            <template #head>
              <div class="marking-overview__panel-head">
                <h3 class="marking-overview__panel-title">已发布学情</h3>
              </div>
            </template>
            <UiSkeletonState v-if="examsLoading" variant="table" :rows="4" :columns="5" compact />
            <UiEmpty
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
        </a-col>
      </a-row>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { MarkDashboardPendingTodoTabKey } from '@/utils/mark-dashboard-todo'
import {
  buildPendingTodoHint,
  buildPendingTodoTabItems,
  filterPendingTodosByTab,
  resolveDefaultPendingTodoTab,
  resolvePendingTodoFocusTone,
} from '@/utils/mark-dashboard-todo'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkingOverviewAnalytics from '@/components/mark/dashboard/MarkingOverviewAnalytics.vue'
import OngoingExamCardGrid from '@/components/mark/dashboard/OngoingExamCardGrid.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import PublishedExamInsightChart from '@/components/mark/dashboard/PublishedExamInsightChart.vue'
import PublishedExamInsightTable from '@/components/mark/dashboard/PublishedExamInsightTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkingOverviewSignals } from '@/composables/useMarkingOverviewSignals'
import { useMarkingOverviewStages } from '@/composables/useMarkingOverviewStages'
import { useMarkTeacherDashboardOverview } from '@/composables/useMarkTeacherDashboardOverview'
import { ExamStatusDescription } from '@/types/enums/exam-status-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { buildExamListRoute } from '@/utils/exam-list-navigation'
import { MARK_DASHBOARD_FILTER_PLACEHOLDERS } from '@/utils/mark-dashboard-filter-options'
import { strictEnumLabel } from '@/utils/strict-enum'

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
  load,
  handleFilterChange,
} = useMarkTeacherDashboardOverview()

const { metrics: dashboardSignals } = useMarkingOverviewSignals({
  filterContext: computed(() => overview.value?.filterContext),
  signalMetrics: computed(() => overview.value?.signalMetrics),
  markingProgressSummary: computed(() => overview.value?.markingProgressSummary),
})

const {
  stages: dashboardStages,
  activeStageKey: dashboardActiveStageKey,
  journeyHint: dashboardJourneyHint,
} = useMarkingOverviewStages({
  exams: computed(() => overview.value?.ongoingExams ?? []),
  journeyStageSummary: computed(() => overview.value?.journeyStageSummary ?? []),
  filteredCount: computed(() => overview.value?.filterContext.filteredExamCount ?? 0),
})

const pageSubtitle = computed(() => {
  const parts: string[] = []
  if (filter.value.academicYear) parts.push(filter.value.academicYear)
  if (filter.value.semester) parts.push(formatSemester(filter.value.semester))
  if (filter.value.status)
    parts.push(strictEnumLabel(ExamStatusDescription, filter.value.status, '考试状态'))
  const scope = parts.length ? parts.join(' · ') : '全部学年学期'

  if (filterRefreshing.value) {
    if (!overview.value) return '加载筛选范围内考试概览'
    return `${scope} · 刷新中…`
  }
  if (!overview.value) return '加载筛选范围内考试概览'
  const total = overview.value.filterContext.filteredExamCount
  return `${scope} · 共 ${total} 场考试`
})

const hasOngoingExams = computed(() => (overview.value?.ongoingExams.length ?? 0) > 0)
const hasPublishedExamInsights = computed(
  () => (overview.value?.publishedExamInsights.length ?? 0) > 0,
)
const publishedExamInsights = computed(() => overview.value?.publishedExamInsights ?? [])
const pendingTodos = computed(() => overview.value?.pendingTodos ?? [])
const hasPendingTodos = computed(() => pendingTodos.value.length > 0)
const showTodoFocusLayout = computed(() => hasPendingTodos.value || todosLoading.value)
const pendingTodoFocusTone = computed(() => resolvePendingTodoFocusTone(pendingTodos.value))
const pendingTodoFocusClass = computed(() =>
  pendingTodoFocusTone.value
    ? `marking-overview__panel--focus-${pendingTodoFocusTone.value}`
    : undefined,
)
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

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.context-bar__filter-select {
  width: 120px;
  min-width: 0;
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
  margin-bottom: var(--dp-space-2);
}

.marking-overview__stage-rail-title {
  font-size: var(--dp-type-table-head-size);
  font-weight: var(--dp-type-table-head-weight);
  color: var(--dp-text-primary);
}

.marking-overview__stage-rail-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  margin-bottom: var(--dp-space-2);
  padding: var(--dp-space-2) var(--dp-space-3);
  border: 1px solid var(--dp-orange-200);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-orange-50);
}

.marking-overview__stage-rail-hint-text {
  font-size: var(--dp-type-hint-size);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.marking-overview__stage-rail-timeline {
  width: 100%;
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .context-bar__filter-select {
    width: 108px;
  }
}

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

.marking-overview__content-grid--todo-focus {
  grid-template-columns: minmax(0, 380px) minmax(0, 1fr);

  .marking-overview__side {
    order: -1;
  }
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .marking-overview__content-grid {
    grid-template-columns: minmax(0, 1fr) 300px;
  }

  .marking-overview__content-grid--todo-focus {
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
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
}

.marking-overview__panel--focus-urgent .marking-overview__panel-desc {
  color: var(--dp-red-600);
}

.marking-overview__panel--focus-attention .marking-overview__panel-title,
.marking-overview__panel--focus-pending .marking-overview__panel-title {
  color: var(--dp-orange-700);
}

.marking-overview__content--todo-focus
  .marking-overview__panel--exams:deep(.workbench-surface-card),
.marking-overview__content--todo-focus
  .marking-overview__panel--secondary:deep(.workbench-surface-card) {
  background: var(--dp-surface-subtle);
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
  margin-bottom: var(--dp-space-5);
}

.marking-overview__bottom-row {
  margin-top: 0;
}

.marking-overview__insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-5);
}

.marking-overview__insight-empty {
  min-height: 240px;
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
  min-height: 260px;
  padding: var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
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
  font-weight: var(--dp-font-weight-title);
  line-height: 1.5;
}

.marking-overview__panel-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
  line-height: 1.5;
}
</style>
