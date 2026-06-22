import type { ComputedRef, Ref } from 'vue'
import type { AuditIssueVO } from '@/apis/quality/audit-issue'
import type { AuditRectificationVO } from '@/apis/quality/audit-rectification'
import type { AuditSupervisionVO } from '@/apis/quality/audit-supervision'
import type { ImprovementTaskVO } from '@/apis/quality/improvement-task'
import type { ImprovementTaskStatus } from '@/apis/quality/types'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'

function parseDueDate(dateStr?: string): number | null {
  if (!dateStr) return null
  const t = Date.parse(dateStr)
  return Number.isNaN(t) ? null : t
}

/** 改进工作台 SignalBand：聚合四 Tab 列表的后端 VO 状态 */
type SignalListSource<T> = Ref<T[]> | ComputedRef<T[]>

export function useImprovementWorkbenchSignals(options: {
  improvementList: SignalListSource<ImprovementTaskVO>
  issueList: SignalListSource<AuditIssueVO>
  rectList: SignalListSource<AuditRectificationVO>
  supList: SignalListSource<AuditSupervisionVO>
}) {
  const signals = computed<SignalMetric[]>(() => {
    const improvementBuckets: Record<ImprovementTaskStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      SUBMITTED: 0,
      REVIEWED: 0,
      RETURNED: 0,
      CLOSED: 0,
    }
    for (const t of options.improvementList.value) {
      improvementBuckets[t.status] += 1
    }
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    let overdue = 0
    let dueSoon = 0
    for (const t of options.improvementList.value) {
      if (t.status === 'CLOSED') continue
      const due = parseDueDate(t.dueDate)
      if (due == null) continue
      if (due < now) overdue += 1
      else if (due - now <= oneWeek) dueSoon += 1
    }
    for (const r of options.rectList.value) {
      if (r.status === 'CLOSED') continue
      const due = parseDueDate(r.dueDate)
      if (due == null) continue
      if (due < now) overdue += 1
      else if (due - now <= oneWeek) dueSoon += 1
    }

    const openIssueCount = options.issueList.value.filter(
      (i) => i.status === 'OPEN' || i.status === 'IN_RECTIFICATION',
    ).length
    const activeRectCount = options.rectList.value.filter((r) => r.status !== 'CLOSED').length
    const needsImprovementSup = options.supList.value.filter(
      (s) => s.conclusion === 'NEEDS_IMPROVEMENT' || s.conclusion === 'FAIL',
    ).length

    return [
      { key: 'improvement-total', label: '改进任务', value: options.improvementList.value.length, tone: 'blue' },
      {
        key: 'improvement-in-progress',
        label: '整改中',
        value: improvementBuckets.IN_PROGRESS,
        tone: improvementBuckets.IN_PROGRESS > 0 ? 'orange' : 'gray',
      },
      {
        key: 'improvement-submitted',
        label: '待复评',
        value: improvementBuckets.SUBMITTED,
        tone: improvementBuckets.SUBMITTED > 0 ? 'blue' : 'gray',
      },
      { key: 'overdue', label: '逾期', value: overdue, tone: overdue > 0 ? 'red' : 'gray' },
      { key: 'due-soon', label: '7 天到期', value: dueSoon, tone: dueSoon > 0 ? 'orange' : 'gray' },
      {
        key: 'issue-open',
        label: '待整改问题',
        value: openIssueCount,
        tone: openIssueCount > 0 ? 'red' : 'gray',
      },
      {
        key: 'rect-active',
        label: '在办整改',
        value: activeRectCount,
        tone: activeRectCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'sup-warn',
        label: '督导警示',
        value: needsImprovementSup,
        tone: needsImprovementSup > 0 ? 'red' : 'gray',
      },
    ]
  })

  return { signals }
}
