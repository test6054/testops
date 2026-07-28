import type {
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardPublishedExamInsightItemVO,
  MarkTeacherDashboardTodoTypeCode,
  MarkTeacherDashboardTodoTypeSummaryItemVO,
} from '@/apis/mark/teacher-dashboard'
import type { UiBarChartItem } from '@/components/ui-guide/ui/types'
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'
import { formatTodoTypeLabel } from '@/utils/mark-dashboard-todo'

const TODO_TYPE_TONE: Record<MarkTeacherDashboardTodoTypeCode, UiBarChartItem['tone']> = {
  SCAN_ATTENTION: 'orange',
  PROCESSING_OPEN: 'blue',
  GRADE_PENDING: 'purple',
  REVIEW_PENDING: 'purple',
  SCORE_UNPUBLISHED: 'orange',
  SCORE_PENDING_PUBLISH_REVIEW: 'orange',
  CANDIDATE_UNBOUND: 'red',
  ARBITRATION_PENDING: 'red',
  SPOT_CHECK_PENDING: 'blue',
  EXPERIENCE_ASSIST_PENDING: 'purple',
}

/** 筛选域六步旅程阶段分布柱图项 */
export function buildJourneyStageChartItems(
  summary: MarkTeacherDashboardJourneyStageSummaryItemVO[],
): UiBarChartItem[] {
  const countByKey = new Map(summary.map((item) => [item.journeyKey, item.examCount]))
  return EXAM_JOURNEY_STEPS.map((step) => {
    const count = countByKey.get(step.key) ?? 0
    return {
      key: step.key,
      label: step.title,
      value: count,
      tone: count > 0 ? 'blue' : 'gray',
    }
  })
}

/** 筛选域阅卷进度柱图项 */
export function buildMarkingProgressChartItems(
  summary: MarkTeacherDashboardMarkingProgressSummaryVO,
): UiBarChartItem[] {
  const items: UiBarChartItem[] = []
  if (summary.candidateCount > 0) {
    items.push({
      key: 'candidates',
      label: '考生名册',
      value: summary.candidateCount,
      tone: 'gray',
    })
  }
  if (summary.totalQuestionGradeCount > 0) {
    items.push({
      key: 'confirmed-grades',
      label: '已确认题目',
      value: summary.confirmedQuestionGradeCount,
      tone: 'green',
      helper: `共 ${summary.totalQuestionGradeCount} 道`,
    })
    const pendingGrades = summary.totalQuestionGradeCount - summary.confirmedQuestionGradeCount
    if (pendingGrades > 0) {
      items.push({
        key: 'pending-grades',
        label: '待确认题目',
        value: pendingGrades,
        tone: 'purple',
      })
    }
  } else if (summary.pendingGradeCount > 0) {
    items.push({
      key: 'pending-grades',
      label: '待确认题目',
      value: summary.pendingGradeCount,
      tone: 'purple',
    })
  }
  const pipelineDefs: Array<{
    key: string
    label: string
    value: number
    tone: UiBarChartItem['tone']
  }> = [
    {
      key: 'scan-attention',
      label: '扫描需关注',
      value: summary.scanAttentionCount,
      tone: 'orange',
    },
    {
      key: 'processing-open',
      label: '识别处理中',
      value: summary.openProcessingTaskCount,
      tone: 'blue',
    },
    {
      key: 'review-pending',
      label: '待复核',
      value: summary.pendingReviewTaskCount,
      tone: 'purple',
    },
    {
      key: 'score-unpublished',
      label: '待发布成绩',
      value: summary.confirmedUnpublishedScoreCount,
      tone: 'orange',
    },
  ]
  for (const def of pipelineDefs) {
    if (def.value > 0) {
      items.push({
        key: def.key,
        label: def.label,
        value: def.value,
        tone: def.tone,
      })
    }
  }
  return items
}

/** 筛选域待办类型构成柱图项 */
export function buildTodoTypeChartItems(
  summary: MarkTeacherDashboardTodoTypeSummaryItemVO[],
): UiBarChartItem[] {
  return summary.map((item) => ({
    key: item.todoType,
    label: formatTodoTypeLabel(item.todoType, item.count),
    value: item.count,
    tone: TODO_TYPE_TONE[item.todoType],
  }))
}

export interface PublishedInsightChartExam {
  examId: string
  examName: string
  averageScore: number | null
  passRatePercent: number | null
}

/** 已发布学情对比数据：均分与及格率 */
export function buildPublishedInsightChartExams(
  insights: MarkTeacherDashboardPublishedExamInsightItemVO[],
): PublishedInsightChartExam[] {
  return insights
    .map((insight) => ({
      examId: insight.examId,
      examName: insight.examName,
      averageScore: insight.averageScore ?? null,
      passRatePercent: insight.passRate != null ? insight.passRate * 100 : null,
    }))
    .filter((exam) => exam.averageScore != null || exam.passRatePercent != null)
}

export function filterScopeHint(filteredCount: number): string {
  return filteredCount > 0 ? `筛选域 ${filteredCount} 场` : '当前筛选暂无考试'
}
