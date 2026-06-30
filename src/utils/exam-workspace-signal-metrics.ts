import type { MarkingProgressVO } from '@/apis/mark/exam-progress'
import type { SignalMetric } from '@/types/workbench'

/** 考试工作台顶部 SignalBand 指标点击回调 */
export interface ExamWorkspaceSignalMetricHandlers {
  onScanAttention?: () => void
  onGradable?: () => void
  onGradeRate?: () => void
  onPendingReview?: () => void
  onOpenProcessing?: () => void
}

/**
 * 从阅卷进度合同构建考试级 KPI；零值槽位隐藏，指标可点击跳转子页。
 */
export function buildExamWorkspaceSignalMetrics(
  progress: MarkingProgressVO | null | undefined,
  handlers?: ExamWorkspaceSignalMetricHandlers,
): SignalMetric[] {
  if (!progress) {
    return []
  }
  const metrics: SignalMetric[] = []

  if (progress.scanAttentionCount > 0) {
    metrics.push({
      key: 'scan-attention',
      label: '扫描待处理',
      value: progress.scanAttentionCount,
      tone: 'orange',
      clickable: Boolean(handlers?.onScanAttention),
    })
  }

  if (progress.paperCount > 0) {
    metrics.push({
      key: 'gradable',
      label: '可阅卷卷面',
      value: progress.gradablePaperCount,
      unit: `/${progress.paperCount}`,
      tone: progress.gradablePaperCount < progress.paperCount ? 'orange' : 'green',
      clickable: Boolean(handlers?.onGradable),
    })
  }

  if (progress.totalQuestionGradeCount > 0) {
    const gradeRate = Math.round(
      (progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100,
    )
    metrics.push({
      key: 'grade-rate',
      label: '批阅完成率',
      value: gradeRate,
      unit: '%',
      tone: gradeRate >= 100 ? 'green' : gradeRate > 0 ? 'blue' : 'gray',
      clickable: Boolean(handlers?.onGradeRate),
    })
  }

  const pendingReview = progress.pendingReviewTaskCount + progress.inProgressReviewTaskCount
  if (pendingReview > 0) {
    metrics.push({
      key: 'review-tasks',
      label: '复核任务',
      value: pendingReview,
      tone: 'blue',
      clickable: Boolean(handlers?.onPendingReview),
    })
  }

  if (progress.openProcessingTaskCount > 0) {
    metrics.push({
      key: 'open-processing',
      label: '待裁定',
      value: progress.openProcessingTaskCount,
      tone: 'orange',
      clickable: Boolean(handlers?.onOpenProcessing),
    })
  }

  return metrics
}
