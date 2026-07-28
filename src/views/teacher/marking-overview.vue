<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="阅卷概览"
      >
        <template #toolbar>
          <div
            class="marking-overview__scope dp-exam-scope"
            role="group"
            aria-label="概览范围筛选"
          >
            <div class="dp-exam-scope__item">
              <UiSelect
                size="sm"
                v-model="filter.academicYear"
                :options="academicYearOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.academicYear"
                :loading="filterRefreshing"
                @change="handleFilterChange"
              />
            </div>
            <div class="dp-exam-scope__item">
              <UiSelect
                size="sm"
                v-model="filter.semester"
                :options="semesterOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.semester"
                :loading="filterRefreshing"
                :disabled="!filter.academicYear"
                @change="handleFilterChange"
              />
            </div>
            <div class="dp-exam-scope__item dp-exam-scope__item--status">
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
            <UiButton
              size="sm"
              variant="outline"
              class="marking-overview__scope-current-term"
              :disabled="isCurrentTermSelected"
              @click="handleUseCurrentTerm"
            >
              本学期
            </UiButton>
            <UiSpin v-if="filterRefreshing" size="sm" class="marking-overview__filter-spin" />
          </div>
        </template>
        <template #actions>
          <UiButton
            v-if="hasPendingTodos === true"
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
      <div class="marking-overview__analytics-row">
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
      </div>

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
              <UiAlertStrip
                v-else-if="signalLoadFailed && !overview"
                tone="error"
                title="概览指标加载失败"
                dense
              />
              <UiSkeletonState v-else-if="examsPanelLoading" variant="list" :rows="4" compact />
              <UiAlertStrip
                v-else-if="examsLoadFailed"
                tone="error"
                title="考试列表加载失败"
                dense
              />
              <template v-else>
                <UiEmpty
                  v-if="ongoingExamItems.length === 0"
                  size="sm"
                  :description="
                    selectedJourneyKey
                      ? '当前筛选范围内无该阶段考试，可清除阶段筛选'
                      : '当前筛选下暂无进行中考试'
                  "
                />
                <template v-else>
                  <OngoingExamCardGrid
                    :exams="ongoingExamItems"
                    @navigate="goExamWorkspace"
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
                  <p v-if="hasPendingTodos === true" class="marking-overview__panel-desc">
                    {{ pendingTodoHint }}
                  </p>
                </div>
                <UiButton
                  v-if="hasPendingTodos === true"
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
              <UiAlertStrip
                v-else-if="signalLoadFailed && !overview"
                tone="error"
                title="概览指标加载失败"
                dense
              />
              <UiSkeletonState v-else-if="todosPanelLoading" variant="list" :rows="5" compact />
              <UiAlertStrip
                v-else-if="todosLoadFailed"
                tone="error"
                title="待办加载失败"
                dense
              />
              <template v-else>
                <UiSectionTabs
                  v-if="hasPendingTodos === true"
                  :model-value="pendingTodoTabKey"
                  :items="pendingTodoTabItems"
                  compact
                  class="marking-overview__todo-tabs"
                  @update:model-value="handlePendingTodoTabChange"
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

      <div class="marking-overview__bottom-row">
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
          <UiAlertStrip
            v-else-if="signalLoadFailed && !overview"
            tone="error"
            title="概览指标加载失败"
            dense
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
      </div>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import type { WorkbenchStage } from '@/types/workbench'
import type {MarkDashboardPendingTodoTabKey} from '@/utils/mark-dashboard-todo';
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkingOverviewAnalytics from '@/components/mark/dashboard/MarkingOverviewAnalytics.vue'
import OngoingExamCardGrid from '@/components/mark/dashboard/OngoingExamCardGrid.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import PublishedExamInsightChart from '@/components/mark/dashboard/PublishedExamInsightChart.vue'
import PublishedExamInsightTable from '@/components/mark/dashboard/PublishedExamInsightTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'


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
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'
import { ExamWorkbenchPriorityReasonCode } from '@/types/enums/exam-workbench-priority-reason-code-enum'
import { requireWorkbenchAcademicYearSemester } from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
import { buildExamListRouteFromDashboardFilter } from '@/utils/exam-list-navigation'
import { MARK_DASHBOARD_FILTER_PLACEHOLDERS } from '@/utils/mark-dashboard-filter-options'
import {
  buildPendingTodoHint,
  buildPendingTodoTabItems,
  
  resolveDefaultPendingTodoTab,
  resolvePendingTodoFocusTone,
  resolvePendingTodoScopeByTab,
  resolvePendingTodoTabByScope
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
  ongoingExamJourneyKey,
  pendingTodoPageNum,
  pendingTodoPageSize,
  pendingTodoScope,
  load,
  loadOngoingExamPage,
  setOngoingExamJourneyKey,
  loadPendingTodoPage,
  handleFilterChange,
  handleUseCurrentTerm,
  isCurrentTermSelected,
  suppressTodoTabReload,
  pendingTodoTabUserChosen,
  markPendingTodoTabUserChosen,
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

/** 旅程轨点击筛选：服务端 journeyKey 过滤后再分页 */
const selectedJourneyKey = ongoingExamJourneyKey

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

const journeyFilterHint = computed(() => {
  if (!selectedJourneyKey.value) {
    return ''
  }
  const step = EXAM_JOURNEY_STEPS.find((item) => item.key === selectedJourneyKey.value)
  const title = step?.title ?? selectedJourneyKey.value
  return `已筛「${title}」· 共 ${ongoingExamPage.value.total} 场`
})

const filteredExamCount = computed(() => overview.value?.filterContext.filteredExamCount ?? 0)


const examsPanelLoading = computed(() => {
  if (signalLoading.value === true && !overview.value) return true
  if (examsLoading.value === true && overview.value != null) return true
  // 旅程筛选空结果是合法空态；仅无旅程筛选且筛选域有考试、分页尚未回填时视为段未就绪
  if (selectedJourneyKey.value) {
    return false
  }
  return filteredExamCount.value > 0
    && ongoingExamPage.value.total === 0
    && !examsLoadFailed.value
    && !!overview.value
})
const todosPanelLoading = computed(() => {
  if (signalLoading.value === true && !overview.value) return true
  if (todosLoading.value === true && overview.value != null) return true
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
  () => !signalLoadFailed.value && (hasPendingTodos.value || (todosLoading.value === true && overview.value != null)),
)
const pendingTodoFocusTone = computed(() => resolvePendingTodoFocusTone(pendingTodoItems.value))
const pendingTodoFocusClass = computed(() =>
  pendingTodoFocusTone.value
    ? `marking-overview__panel--focus-${pendingTodoFocusTone.value}`
    : undefined,
)
const pendingTodoTabKey = ref<MarkDashboardPendingTodoTabKey>(
  resolvePendingTodoTabByScope(pendingTodoScope.value),
)
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
    return examsLoading.value !== true && examsLoadFailed.value !== true && hasOngoingExams.value !== true
  }
  return todosLoading.value !== true && todosLoadFailed.value !== true && hasPendingTodos.value !== true
}

/** scope 是列表真源；未手动选 Tab 时由 composable 写入默认 scope，这里只同步展示。 */
watch(
  pendingTodoScope,
  (scope) => {
    const tab = resolvePendingTodoTabByScope(scope)
    if (pendingTodoTabKey.value !== tab) {
      pendingTodoTabKey.value = tab
    }
  },
  { immediate: true },
)

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
      if (pendingTodoTabKey.value !== 'all') {
        pendingTodoTabKey.value = 'all'
      }
      return
    }
    // 未手动选档时默认 Tab 由 composable 按 signal 写入 scope，再经 scope→tab 同步，避免双写。
    if (!pendingTodoTabUserChosen.value) {
      return
    }
    const tabItems = buildPendingTodoTabItems([], totals)
    const currentTab = tabItems.find((item) => item.key === pendingTodoTabKey.value)
    if (currentTab?.disabled) {
      pendingTodoTabKey.value = resolveDefaultPendingTodoTab(totals)
    }
  },
  { immediate: true },
)

function isPendingTodoTabKey(value: string): value is MarkDashboardPendingTodoTabKey {
  return value === 'all' || value === 'urgent' || value === 'attention'
}

function handlePendingTodoTabChange(tab: string | number): void {
  const next = String(tab)
  if (!isPendingTodoTabKey(next)) {
    showUserError(null, `未知待办 Tab：${next}`)
    return
  }
  markPendingTodoTabUserChosen()
  pendingTodoTabKey.value = next
}

function handleOngoingExamPageChange(pageNum: number, pageSize: number): void {
  void loadOngoingExamPage(pageNum, pageSize)
}

function handlePendingTodoPageChange(pageNum: number, pageSize: number): void {
  void loadPendingTodoPage(pageNum, {
    pageSize,
    todoScope: resolvePendingTodoScopeByTab(pendingTodoTabKey.value),
  })
}


/** 深链前强制成对学期，禁止清空态把 KPI 打成无学期列表。 */
function resolveDashboardDeepLinkFilter() {
  const term = requireWorkbenchAcademicYearSemester(filter.value.academicYear, filter.value.semester)
  filter.value.academicYear = term.academicYear
  filter.value.semester = term.semester
  return {
    academicYear: term.academicYear,
    semester: term.semester,
    status: filter.value.status,
  }
}
/** 查看全部 / 菜单式进入：携带概览当前学年学期状态，打开「全部」Tab。 */
function goExamList() {
  try {
    void router.push(
      buildExamListRouteFromDashboardFilter(resolveDashboardDeepLinkFilter(), { tab: 'all' }),
    )
  } catch (error) {
    showUserError(error, '概览 → 考试列表深链合同无效')
  }
}

function handleJourneyStageSelect(stage: WorkbenchStage): void {
  const key = stage.key as MarkTeacherDashboardJourneyKeyCode
  const next = selectedJourneyKey.value === key ? '' : key
  void setOngoingExamJourneyKey(next)
}

function clearJourneyStageFilter(): void {
  void setOngoingExamJourneyKey('')
}

function handleSignalMetricClick(key: string): void {
  try {
    if (key === 'active' || key === 'marking-progress') {
      void router.push(
        buildExamListRouteFromDashboardFilter(resolveDashboardDeepLinkFilter(), { tab: 'ongoing' }),
      )
      return
    }
    if (key === 'unpublished') {
      void router.push(
        buildExamListRouteFromDashboardFilter(resolveDashboardDeepLinkFilter(), {
          tab: 'priority',
          priorityReason: ExamWorkbenchPriorityReasonCode.CONFIRMED_UNPUBLISHED_SCORE,
        }),
      )
      return
    }
    if (key === 'scan-attention') {
      void router.push(
        buildExamListRouteFromDashboardFilter(resolveDashboardDeepLinkFilter(), {
          tab: 'priority',
          priorityReason: ExamWorkbenchPriorityReasonCode.SCAN_ATTENTION,
        }),
      )
      return
    }
    if (key === 'exceptions' || key === 'arbitration' || key === 'spot-check') {
      goPriorityExamList()
    }
  } catch (error) {
    showUserError(error, '概览 KPI 深链合同无效')
  }
}

/** 待处理等优先事项深链：携带当前学年学期筛选，打开考试列表「优先推进」Tab。 */
function goPriorityExamList() {
  try {
    void router.push(
      buildExamListRouteFromDashboardFilter(resolveDashboardDeepLinkFilter(), { tab: 'priority' }),
    )
  } catch (error) {
    showUserError(error, '概览 → 优先推进深链合同无效')
  }
}

function goExamWorkspace(routeName: string, examId: string) {
  const nextRoute = routeName.trim()
  const nextExamId = examId.trim()
  if (!nextRoute || !nextExamId) {
    showUserError(null, `考试工作台入口合同缺失：examId=${examId || '—'}，route=${routeName || '—'}`)
    return
  }
  void router.push({ name: nextRoute, params: { examId: nextExamId } })
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

/* 范围筛选：可换行，禁止 overflow-x 藏控件（高校 1366 / 侧栏场景） */
.marking-overview__scope {
  justify-content: flex-end;
  min-height: var(--dp-control-height-sm);
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
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-xs);
  min-height: 28px;
}

.marking-overview__stage-rail-head-main {
  display: flex;
  align-items: baseline;
  gap: var(--dp-space-component-tight);
  min-width: 0;
}

.marking-overview__stage-rail-title {
  font-size: var(--dp-type-panel-title-size);
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
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .dp-exam-scope__item {
    flex: 0 1 7.5rem;
    width: 7.5rem;
    min-width: 6.5rem;
    max-width: 9rem;
  }

  .dp-exam-scope__item--status {
    flex-basis: 6.5rem;
    width: 6.5rem;
    min-width: 6rem;
    max-width: 8rem;
  }
}


.marking-overview__content {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.marking-overview__analytics-row {
  margin: 0;
}

.marking-overview__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--dp-workbench-aside-width);
  gap: var(--dp-space-block);
  align-items: stretch;
  margin-bottom: 0;
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
  margin-top: var(--dp-space-block);
  padding-top: var(--dp-space-component);
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
  padding: 0 var(--dp-space-block);
  border-bottom: 1px solid var(--dp-border);
}

.marking-overview__todo-tabs :deep(.ui-section-tabs__head) {
  margin-bottom: 0;
}

.marking-overview__todo-tabs :deep(.ui-section-tabs__helper) {
  margin-bottom: var(--dp-space-component-tight);
}

.marking-overview__analytics-row,
.marking-overview__bottom-row {
  margin-bottom: 0;
}

.marking-overview__analytics-row {
  margin-bottom: var(--dp-space-component);
}

.marking-overview__bottom-row {
  margin-top: 0;
}

.marking-overview__insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-component);
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
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-surface-subtle);
}

.marking-overview__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  width: 100%;
}

.marking-overview__panel-title {
  margin: 0;
  text-transform: none;
  /* 字号/字重/色继承 WorkbenchSurfaceCard__head；焦点色见 --focus-* */
}

.marking-overview__panel-desc {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

/* 工作台各段右缘对齐：禁止 gutter 负边距；块级满宽 */
.marking-overview__analytics-row,
.marking-overview__bottom-row,
.marking-overview__content,
.marking-overview__content-grid,
.marking-overview__stage-rail {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-left: 0;
  margin-right: 0;
}
</style>
