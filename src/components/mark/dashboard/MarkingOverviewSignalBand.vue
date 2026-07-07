<template>
  <SignalBand
    :metrics="metrics"
    compact
    variant="tiles"
    @metric-click="(key) => emit('metric-click', key)"
  />
</template>

<script lang="ts" setup>
import type {
  MarkTeacherDashboardFilterContextVO,
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardSignalMetricsVO,
} from '@/apis/mark/teacher-dashboard'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import SignalBand from '@/components/workbench/SignalBand.vue'

defineOptions({ name: 'MarkingOverviewSignalBand' })

const props = withDefaults(
  defineProps<{
    filterContext?: MarkTeacherDashboardFilterContextVO
    signalMetrics?: MarkTeacherDashboardSignalMetricsVO
    markingProgressSummary?: MarkTeacherDashboardMarkingProgressSummaryVO
    placeholder?: boolean
  }>(),
  {
    placeholder: false,
  },
)

const emit = defineEmits<{
  'metric-click': [key: string]
}>()

const metrics = computed<SignalMetric[]>(() => {
  const dash = props.placeholder ? '—' : 0
  const m = props.signalMetrics
  const progress = props.markingProgressSummary

  const totalQuestions = progress?.totalQuestionGradeCount ?? 0
  const confirmedQuestions = progress?.confirmedQuestionGradeCount ?? 0
  const markingPercent =
    totalQuestions > 0 ? Math.round((confirmedQuestions / totalQuestions) * 1000) / 10 : 0

  const pendingExceptionCount = progress
    ? (progress.scanAttentionCount ?? 0) +
      (progress.pendingReviewTaskCount ?? 0) +
      (progress.pendingGradeCount ?? 0)
    : dash

  const activeExamCount = m?.activeExamCount ?? dash
  const unpublishedCount = m?.confirmedUnpublishedScoreCount ?? 0

  const arbitrationCount = m?.arbitrationPendingCount ?? 0
  const spotCheckCount = m?.spotCheckPendingCount ?? 0

  const tiles: SignalMetric[] = []

  if (typeof arbitrationCount === 'number' && arbitrationCount > 0) {
    tiles.push({
      key: 'arbitration',
      label: '仲裁待审核',
      value: arbitrationCount,
      unit: '项',
      tone: 'red',
      trendPolarity: 'negative',
      clickable: true,
    })
  }

  if (typeof spotCheckCount === 'number' && spotCheckCount > 0) {
    tiles.push({
      key: 'spot-check',
      label: '抽检待处理',
      value: spotCheckCount,
      unit: '项',
      tone: 'orange',
      trendPolarity: 'negative',
      clickable: true,
    })
  }

  tiles.push(
    {
      key: 'active',
      label: '进行中考试',
      value: activeExamCount,
      unit: m ? '场' : undefined,
      tone: 'blue',
      clickable: typeof activeExamCount === 'number' && activeExamCount > 0,
    },
    {
      key: 'graded-questions',
      label: '已评题目',
      value: progress?.confirmedQuestionGradeCount ?? dash,
      unit: progress ? '题' : undefined,
      tone: 'green',
    },
    {
      key: 'marking-progress',
      label: '阅卷进度',
      value: progress ? markingPercent : dash,
      unit: progress ? '%' : undefined,
      tone: 'blue',
      trendPolarity: 'positive',
    },
    {
      key: 'exceptions',
      label: '待处理异常',
      value: pendingExceptionCount,
      unit: progress ? '项' : undefined,
      tone: typeof pendingExceptionCount === 'number' && pendingExceptionCount > 0 ? 'red' : 'gray',
      trendPolarity: 'negative',
      clickable: typeof pendingExceptionCount === 'number' && pendingExceptionCount > 0,
    },
    {
      key: 'unpublished',
      label: '待发布成绩',
      value: m?.confirmedUnpublishedScoreCount ?? dash,
      unit: m ? '份' : undefined,
      tone: unpublishedCount > 0 ? 'orange' : 'gray',
      trendPolarity: 'negative',
      clickable: unpublishedCount > 0,
    },
  )

  return tiles
})
</script>
