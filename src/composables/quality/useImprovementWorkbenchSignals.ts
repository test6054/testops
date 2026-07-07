import type { ComputedRef, Ref } from 'vue'
import type { ImprovementWorkbenchSignalSummaryVO } from '@/apis/quality/workbench'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'

/** 改进工作台 SignalBand：消费后端 signal-summary 聚合结果 */
type SignalSummarySource = Ref<ImprovementWorkbenchSignalSummaryVO | null>
  | ComputedRef<ImprovementWorkbenchSignalSummaryVO | null>

export function useImprovementWorkbenchSignals(options: {
  signalSummary: SignalSummarySource
}) {
  const signals = computed<SignalMetric[]>(() => {
    const summary = options.signalSummary.value
    if (!summary) {
      return []
    }
    return [
      {
        key: 'improvement-total',
        label: '改进任务',
        value: summary.improvementTotal,
        tone: 'blue',
      },
      {
        key: 'improvement-in-progress',
        label: '整改中',
        value: summary.improvementInProgressCount,
        tone: summary.improvementInProgressCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'improvement-submitted',
        label: '待复评',
        value: summary.improvementSubmittedCount,
        tone: summary.improvementSubmittedCount > 0 ? 'blue' : 'gray',
      },
      {
        key: 'overdue',
        label: '逾期',
        value: summary.overdueCount,
        tone: summary.overdueCount > 0 ? 'red' : 'gray',
      },
      {
        key: 'due-soon',
        label: '7 天到期',
        value: summary.dueSoonCount,
        tone: summary.dueSoonCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'issue-open',
        label: '待整改问题',
        value: summary.openIssueCount,
        tone: summary.openIssueCount > 0 ? 'red' : 'gray',
      },
      {
        key: 'rect-active',
        label: '在办整改',
        value: summary.activeRectificationCount,
        tone: summary.activeRectificationCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'sup-warn',
        label: '督导警示',
        value: summary.supervisionWarningCount,
        tone: summary.supervisionWarningCount > 0 ? 'red' : 'gray',
      },
    ]
  })

  return { signals }
}
