import type { MaybeRefOrGetter } from 'vue'
import type {
  MarkTeacherDashboardFilterContextVO,
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardSignalMetricsVO,
} from '@/apis/mark/teacher-dashboard'
import type { SignalMetric } from '@/types/workbench'
import { computed, toValue } from 'vue'

export interface UseMarkingOverviewSignalsOptions {
  filterContext?: MaybeRefOrGetter<MarkTeacherDashboardFilterContextVO | undefined>
  signalMetrics?: MaybeRefOrGetter<MarkTeacherDashboardSignalMetricsVO | undefined>
  markingProgressSummary?: MaybeRefOrGetter<
    MarkTeacherDashboardMarkingProgressSummaryVO | undefined
  >
  placeholder?: MaybeRefOrGetter<boolean>
}

/** 阅卷概览 SignalBand：将 dashboard 信号区 DTO 映射为工作台指标带展示模型。 */
export function useMarkingOverviewSignals(options: UseMarkingOverviewSignalsOptions) {
  const metrics = computed<SignalMetric[]>(() => {
    const placeholder = toValue(options.placeholder) === true
    const dash = placeholder ? '—' : 0
    const m = toValue(options.signalMetrics)
    const progress = toValue(options.markingProgressSummary)
    const filterContext = toValue(options.filterContext)

    const totalQuestions = progress?.totalQuestionGradeCount ?? 0
    const confirmedQuestions = progress?.confirmedQuestionGradeCount ?? 0
    const markingPercent
      = totalQuestions > 0 ? Math.round((confirmedQuestions / totalQuestions) * 1000) / 10 : 0

    const pendingTodoRowCount = m?.pendingTodoRowCount ?? dash

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

    if (typeof pendingTodoRowCount === 'number' && pendingTodoRowCount > 0) {
      tiles.push({
        key: 'exceptions',
        label: '待处理事项',
        value: pendingTodoRowCount,
        unit: '项',
        tone: 'red',
        trendPolarity: 'negative',
        clickable: true,
      })
    }

    if (unpublishedCount > 0) {
      tiles.push({
        key: 'unpublished',
        label: '待发布成绩',
        value: unpublishedCount,
        unit: '份',
        tone: 'orange',
        trendPolarity: 'negative',
        clickable: true,
      })
    }

    if (typeof activeExamCount === 'number' && activeExamCount > 0) {
      tiles.push({
        key: 'active',
        label: '进行中考试',
        value: activeExamCount,
        unit: m ? '场' : undefined,
        tone: 'blue',
        clickable: true,
      })
    }

    if (progress && totalQuestions > 0) {
      tiles.push({
        key: 'marking-progress',
        label: '阅卷进度',
        value: markingPercent,
        unit: '%',
        tone: 'blue',
        trendPolarity: 'positive',
        helper: `${confirmedQuestions.toLocaleString('zh-CN')} / ${totalQuestions.toLocaleString('zh-CN')} 题`,
      })
    }

    if (!tiles.length && placeholder) {
      tiles.push(
        {
          key: 'active',
          label: '进行中考试',
          value: '—',
          tone: 'gray',
        },
        {
          key: 'marking-progress',
          label: '阅卷进度',
          value: '—',
          tone: 'gray',
        },
        {
          key: 'exceptions',
          label: '待处理事项',
          value: '—',
          tone: 'gray',
        },
      )
    }

    if (!tiles.length && !placeholder && (filterContext?.filteredExamCount ?? 0) > 0) {
      tiles.push({
        key: 'active',
        label: '筛选范围内考试',
        value: filterContext?.filteredExamCount ?? 0,
        unit: '场',
        tone: 'gray',
        clickable: typeof activeExamCount === 'number' && activeExamCount > 0,
      })
    }

    return tiles.slice(0, 6)
  })

  return { metrics }
}
