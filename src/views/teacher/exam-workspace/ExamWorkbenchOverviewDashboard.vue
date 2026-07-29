<template>
  <div class="exam-overview-dash">
    <UiAlertStrip
      v-if="overview?.securityNotice?.message"
      tone="warning"
      :title="overview.securityNotice.message"
      class="exam-overview-dash__security"
    />

    <UiSkeletonState v-if="loading" variant="card" :card-count="2" compact />

    <UiStateBlock
      v-else-if="loadFailed || !overview"
      state="error"
      size="sm"
      title="考试总览加载失败"
      description="可离开后重新进入，或使用页面既有刷新工具恢复"
    />

    <template v-else>
      <SignalBand
        v-if="kpiMetrics.length"
        layout="spotlight"
        compact
        variant="panel"
        :metrics="kpiMetrics"
        class="exam-overview-dash__kpi"
        @metric-click="handleKpiClick"
      />

      <div class="exam-overview-dash__layout">
        <div class="exam-overview-dash__main">
          <WorkbenchSurfaceCard flush class="exam-overview-dash__status-card">
            <article class="exam-status-card exam-status-card--flush">
              <header class="exam-status-card__head">
                <div class="exam-status-card__head-main">
                  <p v-if="examMeta" class="exam-status-card__meta exam-status-card__meta--lead">
                    {{ examMeta }}
                  </p>
                </div>
                <UiTag
                  v-if="activeJourneyTag"
                  :tone="activeJourneyTag.tone"
                  size="sm"
                >
                  {{ activeJourneyTag.label }}
                </UiTag>
              </header>
              <div class="exam-status-card__progress">
                <div class="exam-status-card__progress-label">
                  <span>批阅进度</span>
                  <span>{{ markingPercentLabel }}</span>
                </div>
                <div class="exam-status-card__progress-track">
                  <div
                    class="exam-status-card__progress-fill"
                    :style="{
                      transform: `scaleX(${markingProgressFraction})`,
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
                <UiButton
                  v-if="recommendedPrimaryLabel"
                  size="sm"
                  variant="primary"
                  @click="emit('primary-action')"
                >
                  {{ recommendedPrimaryLabel }}
                </UiButton>
                <UiButton
                  v-if="recommendedSecondaryVisible"
                  size="sm"
                  variant="outline"
                  @click="emit('secondary-action')"
                >
                  {{ recommendedSecondaryLabel }}
                </UiButton>
              </footer>
            </article>
          </WorkbenchSurfaceCard>

          <ExamWorkbenchPrepChecklist
            v-if="overview.prepSteps.length"
            :steps="overview.prepSteps"
            @step-navigate="emit('prep-step-navigate', $event)"
          />

          <ExamQuestionTypeChart
            v-if="hasQuestionTypeStats"
            :data="overview.questionTypeStats ?? null"
            :loading="false"
          />

          <WorkbenchSurfaceCard
            v-if="qualityAttentionItems.length || qualityItems.length"
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
            <p v-if="qualityAttentionSummary" class="exam-overview-dash__quality-summary">
              {{ qualityAttentionSummary }}
            </p>
            <ul v-if="qualityDisplayItems.length > 0" class="exam-overview-dash__quality-list">
              <li
                v-for="item in qualityDisplayItems"
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
import type {
  ExamWorkbenchLifecycleOverviewResponse,
  ExamWorkbenchPrepStepResponse,
} from '@/apis/mark/exam-progress'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getWorkbenchLifecycleOverview } from '@/apis/mark/exam-progress'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'
import { WorkbenchStageStatusDescription } from '@/types/enums/exam-workbench-stage-status-enum'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
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
  recommendedSecondaryVisible?: boolean
}>()

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
  'enter-quality': []
  'todo-navigate': [routeName: string | undefined, examId: string | undefined]
  'prep-step-navigate': [step: ExamWorkbenchPrepStepResponse]
  "loaded": [overview: ExamWorkbenchLifecycleOverviewResponse]
}>()

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const overview = ref<ExamWorkbenchLifecycleOverviewResponse | null>(null)
const loadGeneration = ref(0)

const recommendedPrimaryLabel = computed(() => props.recommendedPrimaryLabel?.trim() || '')
const recommendedSecondaryLabel = computed(() => props.recommendedSecondaryLabel?.trim() || '')
const recommendedSecondaryVisible = computed(
  () => props.recommendedSecondaryVisible === true && Boolean(recommendedSecondaryLabel.value),
)

const dashboardPanel = computed(() => overview.value?.dashboardPanel ?? null)
const hasQuestionTypeStats = computed(
  () => Boolean(overview.value?.questionTypeStats && overview.value.questionTypeStats.items.length > 0),
)
const taskSummary = computed(() => dashboardPanel.value?.markingTaskSummary ?? null)
const quickStats = computed(() => dashboardPanel.value?.quickStats ?? null)
const pendingTodos = computed(() => dashboardPanel.value?.pendingTodos ?? [])
const qualityItems = computed(() => dashboardPanel.value?.qualityOverviewItems ?? [])
const QUALITY_ATTENTION_THRESHOLD = 85
const qualityAttentionItems = computed(() =>
  qualityItems.value
    .filter((item) => item.consistencyRate < QUALITY_ATTENTION_THRESHOLD)
    .slice()
    .sort((a, b) => a.consistencyRate - b.consistencyRate),
)
const qualityDisplayItems = computed(() => {
  if (qualityAttentionItems.value.length > 0) {
    return qualityAttentionItems.value
  }
  return qualityItems.value.slice(0, 5)
})
const qualityAttentionSummary = computed(() => {
  if (qualityAttentionItems.value.length === 0) {
    return ''
  }
  return `一致性低于 ${QUALITY_ATTENTION_THRESHOLD}% 的阅卷教师 ${qualityAttentionItems.value.length} 人，优先关注`
})

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

const activeJourneyTag = computed(() => {
  const active = journeyStages.value.find(
    (stage) => stage.status === 'active'
      || stage.status === 'warning'
      || stage.status === 'error'
      || stage.status === 'blocked',
  )
  if (!active) {
    return null
  }
  if (active.status === 'error' || active.status === 'blocked') {
    return { label: active.title, tone: 'red' as const }
  }
  if (active.status === 'warning') {
    return { label: active.title, tone: 'orange' as const }
  }
  return { label: active.title, tone: 'blue' as const }
})

const kpiMetrics = computed<SignalMetric[]>(() => {
  if (!overview.value) {
    return []
  }
  const mapped = overview.value.kpiBand.map((item) => ({
    key: item.drillKey,
    label: item.label,
    value: item.value,
    helper: item.helper,
    trend: item.trendPercent ?? undefined,
    clickable: item.clickable,
    tone: resolveKpiTone(item.drillKey, item.value),
  }))
  if (mapped.length === 0) {
    return []
  }

  // 考试工作台：异常/发布阻塞优先主卡，其次批阅与备考（后端 kpiBand 真源）
  const priorityKeys = ['scan', 'publish', 'marking', 'prep', 'archive'] as const
  function isAttentionMetric(item: (typeof mapped)[number]): boolean {
    if (item.key === 'scan' && String(item.value) !== '0') {
      return true
    }
    if (item.key === 'publish' && String(item.value) === '待处置') {
      return true
    }
    if (item.key === 'marking' && item.tone === 'orange') {
      return true
    }
    return false
  }
  const primary
    = mapped.find((item) => isAttentionMetric(item))
      ?? priorityKeys
        .map((key) => mapped.find((item) => item.key === key))
        .find((item): item is (typeof mapped)[number] => item != null)
        ?? mapped[0]

  const actionByKey: Record<string, string> = {
    scan: '查看扫描',
    publish: '处理发布',
    marking: '进入批阅',
    prep: '备考准备',
    archive: '查看归档',
  }

  return [
    {
      ...primary,
      emphasis: 'primary' as const,
      actionLabel: primary.clickable ? (actionByKey[primary.key] ?? '查看详情') : undefined,
    },
    ...mapped
      .filter((item) => item.key !== primary.key)
      .slice(0, 3)
      .map((item) => ({ ...item, emphasis: 'secondary' as const })),
  ]
})

/** 无应批题目时进度尚未形成，禁止显示成真实 0% */
const markingPercent = computed((): number | null => {
  const progress = overview.value?.markingProgress
  if (!progress || progress.totalQuestionGradeCount <= 0) {
    return null
  }
  return Math.round((progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100)
})

const markingPercentLabel = computed(() =>
  markingPercent.value == null ? '—' : `${markingPercent.value}%`,
)

const markingProgressFraction = computed(() => {
  if (markingPercent.value == null) {
    return 0
  }
  return Math.max(0, Math.min(1, markingPercent.value / 100))
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

/** 按最新考试上下文加载生命周期总览，切换考试时丢弃旧请求的迟到响应。 */
async function loadOverview(): Promise<void> {
  const generation = ++loadGeneration.value
  if (!props.examId) {
    overview.value = null
    loadFailed.value = false
    loading.value = false
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    const response = await getWorkbenchLifecycleOverview(props.examId)
    if (generation !== loadGeneration.value) {
      return
    }
    overview.value = response
    emit('loaded', response)
  } catch (error) {
    if (generation !== loadGeneration.value) {
      return
    }
    overview.value = null
    loadFailed.value = true
    showUserError(error, '考试总览加载失败')
  } finally {
    if (generation === loadGeneration.value) {
      loading.value = false
    }
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

defineExpose({
  reload: loadOverview,
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.exam-overview-dash {
  &__security,
  &__kpi {
    margin-bottom: var(--dp-space-block);
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--dp-workbench-aside-width);
    gap: var(--dp-space-block);
    align-items: start;

    @media (max-width: #{bp.$ant-grid-lg - 1px}) {
      grid-template-columns: 1fr;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-block);
    min-width: 0;
  }

  &__side {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-block);
    min-width: 0;
  }

  :deep(.exam-status-card__meta--lead) {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 500;
    color: var(--dp-text-secondary);
    line-height: 1.5;
  }

  :deep(.exam-status-card__risk) {
    margin: var(--dp-space-component-tight) 0 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  :deep(.exam-status-card--flush) {
    padding: var(--dp-space-block);
  }

  :deep(.exam-status-card__stats) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-block) var(--dp-space-section-loose);
  }

  :deep(.exam-status-card__foot) {
    margin-top: var(--dp-space-component);
    padding-top: var(--dp-space-block);
    border-top: 1px solid var(--dp-border-subtle);
  }

  &__quality-summary {
    margin: 0 0 var(--dp-space-component);
    font-size: var(--dp-font-size-sm);
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__quality-head,
  &__panel-title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    margin: 0;
    /* 字号/字重继承 WorkbenchSurfaceCard__head */
  }

  &__quality-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__quality-row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) var(--dp-space-component-xs);
    border-radius: var(--dp-radius-control);
    transition: background var(--dp-duration-fast) var(--dp-ease-default);

    &:hover {
      background: var(--dp-surface-chrome);
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
    background: var(--dp-fill-quaternary);
    overflow: hidden;
  }

  &__quality-fill {
    width: 100%;
    height: 100%;
    background: var(--dp-color-primary);
    border-radius: inherit;
    transform-origin: left center;
    transition: transform var(--dp-duration-normal) var(--dp-ease-default);

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

  &__todo-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 var(--dp-space-component-xs);
    border-radius: var(--dp-radius-full);
    background: var(--dp-red-500);
    color: var(--dp-text-inverse);
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
  }

  &__quick-list {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      padding: var(--dp-space-component-tight) 0;
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
