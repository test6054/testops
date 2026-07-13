<template>
  <div class="exam-overview-dash">
    <ExamJourneyMiniStrip :stages="stages" @stage-click="emit('stage-click', $event)" />

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
              <UiTag v-if="stageTagLabel" :tone="stageTagTone" size="sm">{{ stageTagLabel }}</UiTag>
            </header>
            <div class="exam-status-card__progress">
              <div class="exam-status-card__progress-label">
                <span>批阅进度</span>
                <span>{{ markingPercent }}%</span>
              </div>
              <div class="exam-status-card__progress-track">
                <div
                  class="exam-status-card__progress-fill"
                  :style="{ width: `${markingPercent}%` }"
                />
              </div>
            </div>
            <div class="exam-status-card__stats">
              <div>
                <div class="exam-status-card__stat-value">{{ detail.candidateCount }}</div>
                <div class="exam-status-card__stat-label">考生</div>
              </div>
              <div>
                <div class="exam-status-card__stat-value exam-status-card__stat-value--green">
                  {{ markingProgress?.gradablePaperCount ?? 0 }}
                  <span class="exam-status-card__stat-sub">/{{ markingProgress?.paperCount ?? 0 }}</span>
                </div>
                <div class="exam-status-card__stat-label">可阅卷</div>
              </div>
              <div v-if="markingPercent > 0 || (markingProgress?.totalQuestionGradeCount ?? 0) > 0">
                <div class="exam-status-card__stat-value exam-status-card__stat-value--blue">
                  {{ markingPercent }}%
                </div>
                <div class="exam-status-card__stat-label">批阅进度</div>
              </div>
              <div v-if="(markingProgress?.scanAttentionCount ?? 0) > 0">
                <div
                  class="exam-status-card__stat-value"
                  :class="{
                    'exam-status-card__stat-value--orange':
                      (markingProgress?.scanAttentionCount ?? 0) > 0,
                  }"
                >
                  {{ markingProgress?.scanAttentionCount ?? 0 }}
                </div>
                <div class="exam-status-card__stat-label">扫描异常</div>
              </div>
            </div>
            <footer class="exam-status-card__foot">
              <UiButton
                size="sm"
                variant="primary"
                :disabled="recommendedPrimaryDisabled"
                :title="recommendedPrimaryDisabledReason || undefined"
                @click="emit('primary-action')"
              >
                {{ recommendedPrimaryLabel }}
              </UiButton>
              <UiButton size="sm" variant="outline" @click="emit('secondary-action')">
                {{ recommendedSecondaryLabel }}
              </UiButton>
            </footer>
          </article>
        </WorkbenchSurfaceCard>

        <div v-if="showTaskAnalyticsRow" class="analytics-stats">
          <div v-if="(taskSummary?.totalTaskCount ?? 0) > 0" class="analytics-stats__card">
            <div class="analytics-stats__value">{{ taskSummary!.totalTaskCount }}</div>
            <div class="analytics-stats__label">总任务数</div>
          </div>
          <div v-if="(taskSummary?.finalizedTaskCount ?? 0) > 0" class="analytics-stats__card">
            <div class="analytics-stats__value analytics-stats__value--green">
              {{ taskSummary!.finalizedTaskCount }}
            </div>
            <div class="analytics-stats__label">已完成</div>
          </div>
          <div v-if="examConsistencyRate != null" class="analytics-stats__card">
            <div class="analytics-stats__value" :class="consistencyValueClass">
              {{ examConsistencyRate }}%
            </div>
            <div class="analytics-stats__label">评阅一致性</div>
          </div>
          <div v-else-if="(taskSummary?.pendingTaskCount ?? 0) > 0" class="analytics-stats__card">
            <div class="analytics-stats__value analytics-stats__value--warn">
              {{ taskSummary!.pendingTaskCount }}
            </div>
            <div class="analytics-stats__label">待完成</div>
          </div>
        </div>

        <WorkbenchSurfaceCard class="exam-overview-dash__quality">
          <template #head>
            <div class="exam-overview-dash__quality-head">
              <h3 class="exam-overview-dash__panel-title">质量概览</h3>
              <UiButton variant="ghost" size="sm" @click="emit('enter-quality')">
                查看完整报告
              </UiButton>
            </div>
          </template>
          <UiEmpty v-if="!qualityItems.length && !qualityRadarHasData" description="暂无质量数据" />
          <template v-else>
            <MarkChart
              v-if="qualityRadarHasData"
              :option="qualityRadarOption"
              height="220px"
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
                    :style="{ width: `${Math.min(item.consistencyRate, 100)}%` }"
                  />
                </div>
                <span class="exam-overview-dash__quality-rate">{{ item.consistencyRate }}%</span>
              </li>
            </ul>
          </template>
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

        <WorkbenchSurfaceCard v-if="quickStats" class="exam-overview-dash__panel">
          <template #head>
            <h3 class="exam-overview-dash__panel-title">快速统计</h3>
          </template>
          <ul class="exam-overview-dash__quick-list">
            <li>
              <span>阅卷教师</span><strong>{{ quickStats.reviewerCount }} 人</strong>
            </li>
            <li>
              <span>题组数</span><strong>{{ quickStats.groupCount }} 组</strong>
            </li>
            <li>
              <span>已回收</span><strong>{{ quickStats.recycledTaskCount }} 份</strong>
            </li>
            <li>
              <span>仲裁中</span><strong>{{ quickStats.arbitrationPendingCount }} 份</strong>
            </li>
            <li>
              <span>待抽检</span><strong>{{ quickStats.spotCheckPendingCount }} 项</strong>
            </li>
          </ul>
        </WorkbenchSurfaceCard>
      </aside>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type {
  ExamWorkbenchDashboardPanelResponse,
  ExamWorkbenchStageItemResponse,
  ExamWorkbenchStageKeyCode,
  MarkingProgressResponse,
  WorkbenchStageStatusCode,
} from '@/apis/mark/exam-progress'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import MarkChart from '@/components/chart/MarkChart.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ExamJourneyMiniStrip from '@/components/workbench/ExamJourneyMiniStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { WORKSPACE_STAGE_STATUS_TONE } from '@/constants/mark-workspace-nav'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { formatSemester } from '@/types/enums/semester-enum'
import { buildExamQualityRadarChartOption } from '@/utils/exam-quality-charts'
import { formatDateTime } from '@/utils/format'
import { countUrgentTodos } from '@/utils/mark-dashboard-todo'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamWorkbenchOverviewDashboard' })

const props = defineProps<{
  detail: ExamDetailResponse
  markingProgress: MarkingProgressResponse | null
  stages: ExamWorkbenchStageItemResponse[]
  dashboardPanel: ExamWorkbenchDashboardPanelResponse | null
  suggestedStageTitle?: string
  suggestedStageStatus?: WorkbenchStageStatusCode
  recommendedPrimaryLabel?: string
  recommendedSecondaryLabel?: string
  recommendedPrimaryDisabled?: boolean
  recommendedPrimaryDisabledReason?: string
}>()

const emit = defineEmits<{
  'stage-click': [key: ExamWorkbenchStageKeyCode]
  'primary-action': []
  'secondary-action': []
  'enter-quality': []
  'todo-navigate': [routeName: string | undefined, examId: string | undefined]
}>()

const recommendedPrimaryLabel = computed(() => props.recommendedPrimaryLabel?.trim() || '进入阅卷')
const recommendedSecondaryLabel = computed(
  () => props.recommendedSecondaryLabel?.trim() || '扫描运营',
)
const recommendedPrimaryDisabled = computed(() => Boolean(props.recommendedPrimaryDisabled))
const recommendedPrimaryDisabledReason = computed(
  () => props.recommendedPrimaryDisabledReason?.trim() || '',
)

const taskSummary = computed(() => props.dashboardPanel?.markingTaskSummary ?? null)
const quickStats = computed(() => props.dashboardPanel?.quickStats ?? null)
const pendingTodos = computed(() => props.dashboardPanel?.pendingTodos ?? [])
const qualityItems = computed(() => props.dashboardPanel?.qualityOverviewItems ?? [])
const qualityDimensionItems = computed(() => props.dashboardPanel?.qualityDimensionItems ?? [])

const qualityRadarHasData = computed(() =>
  qualityDimensionItems.value.some((item) => item.score != null),
)

const { chartOption: qualityRadarOption } = useChartOption(() =>
  buildExamQualityRadarChartOption(qualityDimensionItems.value),
)

const examConsistencyRate = computed(
  () => props.dashboardPanel?.qualitySummary?.examConsistencyRate ?? null,
)

const showTaskAnalyticsRow = computed(() => {
  const summary = taskSummary.value
  if (!summary) {
    return false
  }
  if (examConsistencyRate.value != null) {
    return true
  }
  return (
    summary.totalTaskCount > 0 || summary.finalizedTaskCount > 0 || summary.pendingTaskCount > 0
  )
})

const consistencyValueClass = computed(() => {
  const rate = examConsistencyRate.value
  if (rate == null) return ''
  if (rate >= 95) return 'analytics-stats__value--green'
  if (rate >= 85) return ''
  return 'analytics-stats__value--warn'
})

const markingPercent = computed(() => {
  const progress = props.markingProgress
  if (!progress || progress.totalQuestionGradeCount <= 0) {
    return 0
  }
  return Math.round((progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100)
})

const examMeta = computed(() => {
  const term = [props.detail.academicYear, formatSemester(props.detail.semester)]
    .filter(Boolean)
    .join(' · ')
  const time
    = props.detail.examStartTime && props.detail.examEndTime
      ? `${formatDateTime(props.detail.examStartTime)} — ${formatDateTime(props.detail.examEndTime)}`
      : ''
  return [term, time].filter(Boolean).join(' | ')
})

const stageTagLabel = computed(() => props.suggestedStageTitle ?? '')
const stageTagTone = computed((): BadgeTone => {
  if (!props.suggestedStageStatus) return 'blue'
  return strictEnumTone(
    WORKSPACE_STAGE_STATUS_TONE,
    props.suggestedStageStatus,
    '考试工作台阶段状态',
  )
})

const urgentTodoCount = computed(() => countUrgentTodos(pendingTodos.value))

function qualityFillClass(rate: number): string {
  if (rate >= 95) return 'exam-overview-dash__quality-fill--green'
  if (rate >= 85) return ''
  return 'exam-overview-dash__quality-fill--orange'
}
</script>

<style lang="scss" scoped>
.exam-overview-dash {
  &__status-card {
    margin-bottom: var(--dp-space-4);
  }

  :deep(.exam-status-card__meta--lead) {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--dp-text-secondary);
    line-height: 1.5;
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
    font-size: 14px;
    font-weight: 600;
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
    padding: var(--dp-space-2) 0;
  }

  &__quality-name {
    width: 72px;
    flex-shrink: 0;
    font-size: 13px;
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
    height: 100%;
    background: var(--ant-color-primary);
    border-radius: inherit;

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
    font-size: 13px;
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
    color: #fff;
    font-size: 11px;
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
      font-size: 13px;
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
