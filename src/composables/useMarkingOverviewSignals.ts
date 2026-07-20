import type { MaybeRefOrGetter } from 'vue'
import type {
  MarkTeacherDashboardDailyTrendItemVO,
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
  /** 近 14 日进度：仅用于阅卷进度 spark，不编造 */
  dailyProgressTrend?: MaybeRefOrGetter<MarkTeacherDashboardDailyTrendItemVO[] | undefined>
  placeholder?: MaybeRefOrGetter<boolean>
}

/**
 * 阅卷概览 SignalBand：固定核心 KPI，避免仅剩 1～2 个大空格；
 * 仲裁/抽检仅在有积压时追加，总数截断到 6。
 */

/** 阅卷进度 spark：仅使用确认题日序列 */
function resolveProgressSpark(
  trend: MarkTeacherDashboardDailyTrendItemVO[] | undefined,
): number[] | undefined {
  if (!trend?.length) return undefined
  const values = trend.map((point) => point.confirmedGradeCount ?? 0)
  if (!values.some((value) => value > 0)) return undefined
  return values
}

export function useMarkingOverviewSignals(options: UseMarkingOverviewSignalsOptions) {
  const metrics = computed<SignalMetric[]>(() => {
    const placeholder = toValue(options.placeholder) === true
    const m = toValue(options.signalMetrics)
    const progress = toValue(options.markingProgressSummary)
    const filterContext = toValue(options.filterContext)

    if (placeholder) {
      return [
        { key: 'active', label: '进行中考试', value: '—', tone: 'gray', iconTone: 'gray' },
        { key: 'marking-progress', label: '阅卷进度', value: '—', tone: 'gray', iconTone: 'gray' },
        { key: 'exceptions', label: '待处理事项', value: '—', tone: 'gray', iconTone: 'gray' },
        { key: 'unpublished', label: '待发布成绩', value: '—', tone: 'gray', iconTone: 'gray' },
        { key: 'scan-attention', label: '扫描关注', value: '—', tone: 'gray', iconTone: 'gray' },
      ]
    }

    const activeExamCount = m?.activeExamCount ?? 0
    const pendingTodoRowCount = m?.pendingTodoRowCount ?? 0
    const unpublishedCount = m?.confirmedUnpublishedScoreCount ?? 0
    const arbitrationCount = m?.arbitrationPendingCount ?? 0
    const spotCheckCount = m?.spotCheckPendingCount ?? 0
    const scanAttentionCount = progress?.scanAttentionCount ?? 0
    const totalQuestions = progress?.totalQuestionGradeCount ?? 0
    const confirmedQuestions = progress?.confirmedQuestionGradeCount ?? 0
    const markingPercent
      = totalQuestions > 0 ? Math.round((confirmedQuestions / totalQuestions) * 1000) / 10 : 0

    const metricsList: SignalMetric[] = [
      {
        key: 'active',
        label: '进行中考试',
        value: activeExamCount,
        unit: '场',
        tone: activeExamCount > 0 ? 'blue' : 'gray',
        iconTone: activeExamCount > 0 ? 'blue' : 'gray',
        helper: activeExamCount > 0 ? '点击查看进行中列表' : '当前筛选无进行中',
        clickable: true,
      },
      {
        key: 'marking-progress',
        label: '阅卷进度',
        value: markingPercent,
        unit: '%',
        tone: totalQuestions > 0 ? 'blue' : 'gray',
        iconTone: totalQuestions > 0 ? 'blue' : 'gray',
        trendPolarity: 'positive',
        helper:
          totalQuestions > 0
            ? `${confirmedQuestions.toLocaleString('zh-CN')} / ${totalQuestions.toLocaleString('zh-CN')} 题`
            : '暂无确认题量',
        sparkValues: resolveProgressSpark(toValue(options.dailyProgressTrend)),
        clickable: totalQuestions > 0,
      },
      {
        key: 'exceptions',
        label: '待处理事项',
        value: pendingTodoRowCount,
        unit: '项',
        tone: pendingTodoRowCount > 0 ? 'red' : 'gray',
        iconTone: pendingTodoRowCount > 0 ? 'red' : 'gray',
        helper: pendingTodoRowCount > 0 ? '优先推进阻塞项' : '暂无待办',
        trendPolarity: 'negative',
        clickable: pendingTodoRowCount > 0,
      },
      {
        key: 'unpublished',
        label: '待发布成绩',
        value: unpublishedCount,
        unit: '份',
        tone: unpublishedCount > 0 ? 'orange' : 'gray',
        iconTone: unpublishedCount > 0 ? 'orange' : 'gray',
        helper: unpublishedCount > 0 ? '成绩已确认待发布' : '暂无待发布',
        trendPolarity: 'negative',
        clickable: unpublishedCount > 0,
      },
      {
        key: 'scan-attention',
        label: '扫描关注',
        value: scanAttentionCount,
        unit: '项',
        tone: scanAttentionCount > 0 ? 'orange' : 'gray',
        iconTone: scanAttentionCount > 0 ? 'orange' : 'gray',
        helper: scanAttentionCount > 0 ? '扫描异常待处理' : '扫描状态正常',
        trendPolarity: 'negative',
        clickable: scanAttentionCount > 0,
      },
    ]

    if (arbitrationCount > 0) {
      metricsList.push({
        key: 'arbitration',
        label: '仲裁待审核',
        value: arbitrationCount,
        unit: '项',
        tone: 'red',
        iconTone: 'red',
        helper: '需仲裁确认',
        trendPolarity: 'negative',
        clickable: true,
      })
    }

    if (spotCheckCount > 0) {
      metricsList.push({
        key: 'spot-check',
        label: '抽检待处理',
        value: spotCheckCount,
        unit: '项',
        tone: 'orange',
        iconTone: 'orange',
        helper: '抽检队列待处理',
        trendPolarity: 'negative',
        clickable: true,
      })
    }

    // 筛选范围内有考试但核心 KPI 全 0 时，补「筛选范围」语义（通常不会与 active 重复）
    if (
      metricsList.every((item) => item.value === 0)
      && (filterContext?.filteredExamCount ?? 0) > 0
    ) {
      metricsList[0] = {
        key: 'active',
        label: '筛选范围内考试',
        value: filterContext?.filteredExamCount ?? 0,
        unit: '场',
        tone: 'gray',
        iconTone: 'gray',
        helper: '当前筛选范围内',
        clickable: true,
      }
    }

    return metricsList.slice(0, 6)
  })

  return { metrics }
}
