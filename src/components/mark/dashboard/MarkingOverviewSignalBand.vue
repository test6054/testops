<template>
  <SignalBand :metrics="metrics" compact variant="panel" />
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
import { formatSemester } from '@/types/enums/semester-enum'

defineOptions({ name: 'MarkingOverviewSignalBand' })

const props = withDefaults(defineProps<{
  filterContext?: MarkTeacherDashboardFilterContextVO
  signalMetrics?: MarkTeacherDashboardSignalMetricsVO
  markingProgressSummary?: MarkTeacherDashboardMarkingProgressSummaryVO
  placeholder?: boolean
}>(), {
  placeholder: false,
})

const metrics = computed<SignalMetric[]>(() => {
  const dash = props.placeholder ? '—' : 0
  const m = props.signalMetrics
  const progress = props.markingProgressSummary
  const ctx = props.filterContext
  const scopeParts: string[] = []
  if (ctx?.academicYear) scopeParts.push(ctx.academicYear)
  if (ctx?.semester) scopeParts.push(formatSemester(ctx.semester))
  const scopeHint = scopeParts.length ? scopeParts.join(' · ') : '全部学年学期'

  const totalQuestions = progress?.totalQuestionGradeCount ?? 0
  const confirmedQuestions = progress?.confirmedQuestionGradeCount ?? 0
  const markingPercent = totalQuestions > 0
    ? Math.round((confirmedQuestions / totalQuestions) * 1000) / 10
    : 0

  const pendingExceptionCount = progress
    ? (progress.scanAttentionCount ?? 0)
    + (progress.pendingReviewTaskCount ?? 0)
    + (progress.pendingGradeCount ?? 0)
    : dash

  return [
    {
      key: 'active',
      label: '进行中考试',
      value: m?.activeExamCount ?? dash,
      unit: m ? '场' : undefined,
      helper: scopeHint,
    },
    {
      key: 'graded-questions',
      label: '已评题目',
      value: progress?.confirmedQuestionGradeCount ?? dash,
      unit: progress ? '题' : undefined,
      helper: '筛选范围内',
    },
    {
      key: 'marking-progress',
      label: '阅卷进度',
      value: progress ? markingPercent : dash,
      unit: progress ? '%' : undefined,
      helper: totalQuestions > 0 ? `共 ${totalQuestions.toLocaleString('zh-CN')} 题` : '暂无题目',
      trendPolarity: 'positive',
    },
    {
      key: 'exceptions',
      label: '待处理异常',
      value: pendingExceptionCount,
      unit: progress ? '项' : undefined,
      tone: typeof pendingExceptionCount === 'number' && pendingExceptionCount > 0 ? 'red' : 'gray',
      helper: typeof pendingExceptionCount === 'number' && pendingExceptionCount > 0 ? '需关注' : '暂无积压',
      trendPolarity: 'negative',
    },
    {
      key: 'unpublished',
      label: '待发布成绩',
      value: m?.confirmedUnpublishedScoreCount ?? dash,
      unit: m ? '份' : undefined,
      tone: (m?.confirmedUnpublishedScoreCount ?? 0) > 0 ? 'orange' : 'gray',
      helper: (m?.confirmedUnpublishedScoreCount ?? 0) > 0 ? '已确认未发布' : '暂无待发布',
      trendPolarity: 'negative',
    },
  ]
})
</script>
