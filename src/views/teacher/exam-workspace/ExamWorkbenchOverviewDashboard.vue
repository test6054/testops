<template>
  <div class="exam-overview-dash">
    <UiAlertStrip
      v-if="overview?.securityNotice?.message"
      tone="warning"
      :title="overview.securityNotice.message"
      class="exam-overview-dash__security"
    />

    <UiSkeletonState v-if="loading" variant="card" :card-count="2" compact />

    <UiEmpty
      v-else-if="loadFailed || !overview"
      size="sm"
      description="考试总览加载失败，请刷新后重试"
    />

    <template v-else>
      <SignalBand
        compact
        variant="panel"
        :metrics="kpiMetrics"
        class="exam-overview-dash__kpi"
        @metric-click="handleKpiClick"
      />

      <ExamJourneyMiniStrip
        :stages="journeyStages"
        @stage-click="handleJourneyClick"
      />

      <div class="exam-overview-dash__merged">
        <ExamWorkbenchPrepChecklist
          v-if="overview.prepSteps.length"
          :steps="overview.prepSteps"
          @step-navigate="emit('prep-step-navigate', $event)"
        />
        <ExamQuestionTypeChart
          v-if="overview.questionTypeStats"
          :data="overview.questionTypeStats"
          :loading="false"
        />
      </div>

      <div class="exam-overview-dash__layout">
        <div class="exam-overview-dash__main">
          <WorkbenchSurfaceCard flush class="exam-overview-dash__status-card">
            <article class="exam-status-card">
              <header class="exam-status-card__head">
                <div class="exam-status-card__head-main">
                  <p v-if="examMeta" class="exam-status-card__meta exam-status-card__meta--lead">
                    {{ examMeta }}
                  </p>
                </div>
                <UiTag v-if="activeJourneyLabel" tone="blue" size="sm">{{ activeJourneyLabel }}</UiTag>
              </header>
              <div class="exam-status-card__progress">
                <div class="exam-status-card__progress-label">
                  <span>批阅进度</span>
                  <span>{{ markingPercent }}%</span>
                </div>
                <div class="exam-status-card__progress-track">
                  <div
                    class="exam-status-card__progress-fill"
                    :style="{
                      transform: `scaleX(${Math.max(0, Math.min(1, markingPercent / 100))})`,
                    }"
                  />
                </div>
              </div>
              <div class="exam-status-card__stats">
                <div>
                  <div class="exam-status-card__stat-value">{{ detail?.candidateCount ?? '—' }}</div>
                  <div class="exam-status-card__stat-label">考生</div>
                </div>
                <div>
                  <div class="exam-status-card__stat-value exam-status-card__stat-value--green">
                    {{ overview.markingProgress.gradablePaperCount }}
                    <span class="exam-status-card__stat-sub">/{{ overview.markingProgress.paperCount }}</span>
                  </div>
                  <div class="exam-status-card__stat-label">可阅卷</div>
                </div>
                <div v-if="overview.scanAttentionCount > 0">
                  <div class="exam-status-card__stat-value exam-status-card__stat-value--orange">
                    {{ overview.scanAttentionCount }}
                  </div>
                  <div class="exam-status-card__stat-label">扫描异常</div>
                </div>
              </div>
              <p v-if="statusActionHints.length" class="exam-status-card__hints">
                <span v-for="hint in statusActionHints" :key="hint.key" class="exam-status-card__hint">
                  {{ hint.label }}
                </span>
              </p>
              <p v-if="overview.publishRisk.summaryLabel" class="exam-status-card__risk">
                {{ overview.publishRisk.summaryLabel }}
              </p>
              <footer class="exam-status-card__foot">
                <UiButton size="sm" variant="primary" @click="emit('primary-action')">
                  {{ recommendedPrimaryLabel }}
                </UiButton>
                <UiButton size="sm" variant="outline" @click="emit('secondary-action')">
                  {{ recommendedSecondaryLabel }}
                </UiButton>
              </footer>
            </article>
          </WorkbenchSurfaceCard>

          <WorkbenchSurfaceCard
            v-if="qualityItems.length || qualityRadarHasData"
            class="exam-overview-dash__quality"
          >
            <template #head>
              <div class="exam-overview-dash__quality-head">
                <h3 class="exam-overview-dash__panel-title">质量概览</h3>
                <UiButton variant="ghost" size="sm" @click="emit('enter-quality')">
                  查看完整报告
                </UiButton>
              </div>
            </template>
            <MarkChart
              v-if="qualityRadarHasData"
              :option="qualityRadarOption"
              height="180px"
              aria-label="考试质量雷达图"
              class="exam-overview-dash__radar"
            />
            <ul v-if="qualityItems.length > 0" class="exam-overview-dash__quality-list">
              <li
                v-for="item in qualityItems"
                :key="item.reviewerUserId"
                class="exam-overview-dash__quality-row"
              >
                <span class="exam-overview-dash__quality-name">{{ item.reviewerDisplayName }}</span>
                <div class="exam-overview-dash__quality-bar">
                  <div
                    class="exam-overview-dash__quality-fill"
                    :class="qualityFillClass(item.consistencyRate)"
                    :style="{
                      transform: `scaleX(${Math.max(0, Math.min(1, item.consistencyRate / 100))})`,
                    }"
                  />
                </div>
                <span class="exam-overview-dash__quality-rate">{{ item.consistencyRate }}%</span>
              </li>
            </ul>
          </WorkbenchSurfaceCard>
        </div>

        <aside class="exam-overview-dash__side">
          <WorkbenchSurfaceCard class="exam-overview-dash__panel">
            <template #head>
              <h3 class="exam-overview-dash__panel-title">
                待办事项
                <span v-if="urgentTodoCount > 0" class="exam-overview-dash__todo-count">{{
                  urgentTodoCount
                }}</span>
              </h3>
            </template>
            <PendingTodoFeed
              :todos="pendingTodos"
              title-source="todo-type"
              empty-description="当前考试暂无待处理事项"
              @navigate="(route, id) => emit('todo-navigate', route, id)"
            />
          </WorkbenchSurfaceCard>

          <WorkbenchSurfaceCard v-if="quickStatItems.length" class="exam-overview-dash__panel">
            <template #head>
              <h3 class="exam-overview-dash__panel-title">办理统计</h3>
            </template>
            <ul class="exam-overview-dash__quick-list">
              <li v-for="item in quickStatItems" :key="item.key">
                <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
              </li>
            </ul>
          </WorkbenchSurfaceCard>
        </aside>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamWorkbenchLifecycleOverviewResponse } from '@/apis/mark/exam-progress'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getWorkbenchLifecycleOverview } from '@/apis/mark/exam-progress'
import MarkChart from '@/components/chart/MarkChart.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ExamJourneyMiniStrip from '@/components/workbench/ExamJourneyMiniStrip.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { WorkbenchStageStatusDescription } from '@/types/enums/exam-workbench-stage-status-enum'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { buildExamQualityRadarChartOption } from '@/utils/exam-quality-charts'
import { formatDateTime } from '@/utils/format'
import { countUrgentTodos } from '@/utils/mark-dashboard-todo'
import { navigateToJourneyStep } from '@/utils/mark-stage-navigation'
import { strictEnumLabel } from '@/utils/strict-enum'
import ExamQuestionTypeChart from '@/views/teacher/exam-workspace/ExamQuestionTypeChart.vue'
import ExamWorkbenchPrepChecklist from '@/views/teacher/exam-workspace/ExamWorkbenchPrepChecklist.vue'

defineOptions({ name: 'ExamWorkbenchOverviewDashboard' })

const props = defineProps<{
  examId: string
  detail?: ExamDetailResponse | null
  recommendedPrimaryLabel?: string
  recommendedSecondaryLabel?: string
}>()

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
  'enter-quality': []
  'todo-navigate': [routeName: string | undefined, examId: string | undefined]
  'prep-step-navigate': [stepKey: string]
  "loaded": [overview: ExamWorkbenchLifecycleOverviewResponse]
}>()

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const overview = ref<ExamWorkbenchLifecycleOverviewResponse | null>(null)

const recommendedPrimaryLabel = computed(() => props.recommendedPrimaryLabel?.trim() || '进入阅卷')
const recommendedSecondaryLabel = computed(
  () => props.recommendedSecondaryLabel?.trim() || '扫描运营',
)

const dashboardPanel = computed(() => overview.value?.dashboardPanel ?? null)
const taskSummary = computed(() => dashboardPanel.value?.markingTaskSummary ?? null)
const quickStats = computed(() => dashboardPanel.value?.quickStats ?? null)
const pendingTodos = computed(() => dashboardPanel.value?.pendingTodos ?? [])
const qualityItems = computed(() => dashboardPanel.value?.qualityOverviewItems ?? [])
const qualityDimensionItems = computed(() => dashboardPanel.value?.qualityDimensionItems ?? [])

const qualityRadarHasData = computed(() =>
  qualityDimensionItems.value.some((item) => item.score != null),
)

const { chartOption: qualityRadarOption } = useChartOption(() =>
  buildExamQualityRadarChartOption(qualityDimensionItems.value),
)

const examConsistencyRate = computed(
  () => dashboardPanel.value?.qualitySummary?.examConsistencyRate ?? null,
)

const journeyStages = computed<WorkbenchStage[]>(() => {
  if (!overview.value) {
    return []
  }
  const titleByKey = new Map(EXAM_JOURNEY_STEPS.map((step) => [step.key, step.title]))
  return overview.value.journeySummaries.map((item) => ({
    key: item.journeyKey,
    title: titleByKey.get(item.journeyKey) ?? item.journeyKey,
    status: item.status,
    statusText: item.blockingLabel
      ?? strictEnumLabel(WorkbenchStageStatusDescription, item.status, 'journeyStatus'),
  }))
})

const activeJourneyLabel = computed(() => {
  const active = journeyStages.value.find((stage) => stage.status === 'active' || stage.status === 'warning')
  return active?.title ?? ''
})

const kpiMetrics = computed<SignalMetric[]>(() => {
  if (!overview.value) {
    return []
  }
  return overview.value.kpiBand.map((item) => ({
    key: item.drillKey,
    label: item.label,
    value: item.value,
    helper: item.helper,
    trend: item.trendPercent ?? undefined,
    clickable: item.clickable,
    tone: resolveKpiTone(item.drillKey, item.value),
  }))
})

const markingPercent = computed(() => {
  const progress = overview.value?.markingProgress
  if (!progress || progress.totalQuestionGradeCount <= 0) {
    return 0
  }
  return Math.round((progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100)
})

const examMeta = computed(() => {
  if (!props.detail) {
    return overview.value?.examNo ?? ''
  }
  const term = [props.detail.academicYear, formatSemester(props.detail.semester)]
    .filter(Boolean)
    .join(' · ')
  const time
    = props.detail.examStartTime && props.detail.examEndTime
      ? `${formatDateTime(props.detail.examStartTime)} — ${formatDateTime(props.detail.examEndTime)}`
      : ''
  return [term, time].filter(Boolean).join(' | ')
})

const statusActionHints = computed(() => {
  const hints: Array<{ key: string, label: string }> = []
  const summary = taskSummary.value
  if (summary && summary.pendingTaskCount > 0) {
    hints.push({ key: 'pending-task', label: `待完成任务 ${summary.pendingTaskCount}` })
  }
  if (examConsistencyRate.value != null) {
    hints.push({ key: 'consistency', label: `评阅一致性 ${examConsistencyRate.value}%` })
  }
  if (overview.value?.archiveSummary.summaryLabel) {
    hints.push({ key: 'archive', label: overview.value.archiveSummary.summaryLabel })
  }
  return hints
})

const quickStatItems = computed(() => {
  const stats = quickStats.value
  if (!stats) {
    return [] as Array<{ key: string, label: string, value: string }>
  }
  const items: Array<{ key: string, label: string, value: string }> = []
  if (stats.arbitrationPendingCount > 0) {
    items.push({
      key: 'arbitration',
      label: '仲裁中',
      value: `${stats.arbitrationPendingCount} 份`,
    })
  }
  if (stats.spotCheckPendingCount > 0) {
    items.push({
      key: 'spot-check',
      label: '待抽检',
      value: `${stats.spotCheckPendingCount} 项`,
    })
  }
  if (stats.recycledTaskCount > 0) {
    items.push({ key: 'recycled', label: '已回收', value: `${stats.recycledTaskCount} 份` })
  }
  if (stats.reviewerCount > 0) {
    items.push({ key: 'reviewers', label: '阅卷教师', value: `${stats.reviewerCount} 人` })
  }
  if (stats.groupCount > 0) {
    items.push({ key: 'groups', label: '题组数', value: `${stats.groupCount} 组` })
  }
  return items
})

const urgentTodoCount = computed(() => countUrgentTodos(pendingTodos.value))

async function loadOverview(): Promise<void> {
  if (!props.examId) {
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    overview.value = await getWorkbenchLifecycleOverview(props.examId)
    emit('loaded', overview.value)
  } catch (error) {
    overview.value = null
    loadFailed.value = true
    showUserError(error, '考试总览加载失败')
  } finally {
    loading.value = false
  }
}

function handleJourneyClick(journeyKey: string): void {
  if (!props.examId) {
    return
  }
  navigateToJourneyStep(
    router,
    journeyKey as MarkTeacherDashboardJourneyKeyCode,
    props.examId,
    { scanAttentionCount: overview.value?.scanAttentionCount },
  )
}

function resolveKpiTone(
  drillKey: string,
  value: string,
): SignalMetric['tone'] {
  if (drillKey === 'scan' && value !== '0') {
    return 'orange'
  }
  if (drillKey === 'publish' && value === '待处置') {
    return 'orange'
  }
  if (drillKey === 'publish' && value === '就绪') {
    return 'green'
  }
  if (drillKey === 'archive' && value === '已关闭') {
    return 'gray'
  }
  return 'blue'
}

function handleKpiClick(key: string): void {
  if (!props.examId) {
    return
  }
  const routeByKey: Record<string, MarkTeacherDashboardJourneyKeyCode> = {
    prep: MarkTeacherDashboardJourneyKeyCode.PREP,
    scan: MarkTeacherDashboardJourneyKeyCode.SCAN,
    marking: MarkTeacherDashboardJourneyKeyCode.MARK,
    publish: MarkTeacherDashboardJourneyKeyCode.PUBLISH,
    archive: MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
  }
  const journeyKey = routeByKey[key]
  if (journeyKey) {
    handleJourneyClick(journeyKey)
  }
}

function qualityFillClass(rate: number): string {
  if (rate >= 95) return 'exam-overview-dash__quality-fill--green'
  if (rate >= 85) return ''
  return 'exam-overview-dash__quality-fill--orange'
}

watch(
  () => props.examId,
  () => {
    void loadOverview()
  },
  { immediate: true },
)

defineExpose({ reload: loadOverview })
</script>

<style lang="scss" scoped>
.exam-overview-dash {
  &__security,
  &__kpi {
    margin-bottom: var(--dp-space-4);
  }

  &__merged {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--dp-space-4);
    margin-bottom: var(--dp-space-4);
  }

  &__status-card {
    margin-bottom: var(--dp-space-4);
  }

  :deep(.exam-status-card__meta--lead) {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 500;
    color: var(--dp-text-secondary);
    line-height: 1.5;
  }

  :deep(.exam-status-card__risk) {
    margin: var(--dp-space-2) 0 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__quality {
    margin-bottom: var(--dp-space-4);
  }

  &__radar {
    margin-bottom: var(--dp-space-3);
  }

  &__quality-head,
  &__panel-title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--dp-text-primary);
  }

  &__quality-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__quality-row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-3);
    padding: var(--dp-space-2) var(--dp-space-1);
    border-radius: var(--dp-radius-control);
    transition: background var(--dp-duration-fast) ease;

    &:hover {
      background: var(--dp-surface-elevated);
    }
  }

  &__quality-name {
    width: 72px;
    flex-shrink: 0;
    font-size: var(--dp-font-size-sm);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__quality-bar {
    flex: 1;
    height: 6px;
    border-radius: var(--dp-radius-full);
    background: var(--dp-gray-100);
    overflow: hidden;
  }

  &__quality-fill {
    width: 100%;
    height: 100%;
    background: var(--dp-color-primary);
    border-radius: inherit;
    transform-origin: left center;
    transition: transform var(--dp-duration-normal) ease;

    &--green {
      background: var(--dp-green-500);
    }
    &--orange {
      background: var(--dp-orange-500);
    }
  }

  &__quality-rate {
    width: 40px;
    text-align: right;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__panel {
    margin-bottom: var(--dp-space-4);
  }

  &__todo-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: var(--dp-radius-full);
    background: var(--dp-red-500);
    color: var(--dp-text-inverse);
    font-size: var(--dp-font-size-xxs);
    font-weight: 600;
  }

  &__quick-list {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      padding: var(--dp-space-2) 0;
      font-size: var(--dp-font-size-sm);
      border-bottom: 1px solid var(--dp-border);

      &:last-child {
        border-bottom: none;
      }
    }

    strong {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
