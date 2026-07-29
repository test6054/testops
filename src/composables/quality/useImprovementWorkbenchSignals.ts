import type { ComputedRef, Ref } from 'vue'
import type { ImprovementWorkbenchSignalSummaryVO } from '@/apis/quality/workbench'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'

/** 改进工作台 SignalBand：消费后端 signal-summary；任务心智 1 主 + 3 次 */
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

    const overduePrimary: SignalMetric = {
      key: 'overdue',
      label: '逾期',
      value: summary.overdueCount,
      tone: summary.overdueCount > 0 ? 'red' : 'gray',
      emphasis: 'primary',
      actionLabel: summary.overdueCount > 0 ? '处理逾期' : undefined,
      helper: summary.overdueCount > 0 ? '逾期改进优先关闭' : '暂无逾期',
    }
    const issuePrimary: SignalMetric = {
      key: 'issue-open',
      label: '待整改问题',
      value: summary.openIssueCount,
      tone: summary.openIssueCount > 0 ? 'red' : 'gray',
      emphasis: 'primary',
      actionLabel: summary.openIssueCount > 0 ? '查看问题' : undefined,
      helper: summary.openIssueCount > 0 ? '审核评估问题待整改' : '暂无待整改问题',
    }
    const dueSoonPrimary: SignalMetric = {
      key: 'due-soon',
      label: '7 天到期',
      value: summary.dueSoonCount,
      tone: summary.dueSoonCount > 0 ? 'orange' : 'gray',
      emphasis: 'primary',
      actionLabel: summary.dueSoonCount > 0 ? '查看到期' : undefined,
      helper: '近 7 天到期任务',
    }
    const inProgressPrimary: SignalMetric = {
      key: 'improvement-in-progress',
      label: '整改中',
      value: summary.improvementInProgressCount,
      tone: summary.improvementInProgressCount > 0 ? 'orange' : 'gray',
      emphasis: 'primary',
      actionLabel: summary.improvementInProgressCount > 0 ? '推进整改' : undefined,
      helper: '进行中的改进任务',
    }
    const totalPrimary: SignalMetric = {
      key: 'improvement-total',
      label: '改进任务',
      value: summary.improvementTotal,
      tone: 'blue',
      emphasis: 'primary',
      helper: '当前范围改进任务总量',
    }

    const primary
      = summary.overdueCount > 0
        ? overduePrimary
        : summary.openIssueCount > 0
          ? issuePrimary
          : summary.dueSoonCount > 0
            ? dueSoonPrimary
            : summary.improvementInProgressCount > 0
              ? inProgressPrimary
              : totalPrimary

    const secondaryPool: SignalMetric[] = [
      {
        key: 'improvement-total',
        label: '改进任务',
        value: summary.improvementTotal,
        tone: 'blue',
        emphasis: 'secondary',
      },
      {
        key: 'improvement-in-progress',
        label: '整改中',
        value: summary.improvementInProgressCount,
        tone: summary.improvementInProgressCount > 0 ? 'orange' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'improvement-submitted',
        label: '待复评',
        value: summary.improvementSubmittedCount,
        tone: summary.improvementSubmittedCount > 0 ? 'blue' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'overdue',
        label: '逾期',
        value: summary.overdueCount,
        tone: summary.overdueCount > 0 ? 'red' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'due-soon',
        label: '7 天到期',
        value: summary.dueSoonCount,
        tone: summary.dueSoonCount > 0 ? 'orange' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'issue-open',
        label: '待整改问题',
        value: summary.openIssueCount,
        tone: summary.openIssueCount > 0 ? 'red' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'rect-active',
        label: '在办整改',
        value: summary.activeRectificationCount,
        tone: summary.activeRectificationCount > 0 ? 'orange' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'sup-warn',
        label: '督导警示',
        value: summary.supervisionWarningCount,
        tone: summary.supervisionWarningCount > 0 ? 'red' : 'gray',
        emphasis: 'secondary',
      },
    ]

    return [primary, ...secondaryPool.filter((item) => item.key !== primary.key).slice(0, 3)]
  })

  return { signals }
}
