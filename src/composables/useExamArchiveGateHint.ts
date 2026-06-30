import type {Ref} from 'vue';
import type { ArchiveVolumeExamGateVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'

export interface ExamArchiveGateHintState {
  gateProgressHint: string
  gateAnomaly: boolean
  incompleteClasses: Array<{
    classId: string
    className: string
    unpublishedBoundPaperCount: number
  }>
}

export function useExamArchiveGateHint(gate: Ref<ArchiveVolumeExamGateVO | null>) {
  const gateProgressHint = computed(() => resolveGateProgressHint(gate.value))
  const gateAnomaly = computed(() => resolveGateAnomaly(gate.value))
  const incompleteClasses = computed(() => resolveIncompleteClasses(gate.value))

  return {
    gateProgressHint,
    gateAnomaly,
    incompleteClasses,
  }
}

function resolveGateProgressHint(gate: ArchiveVolumeExamGateVO | null): string {
  if (!gate) {
    return '—'
  }
  if (gate.gateOpen) {
    return '已完成'
  }
  if (gate.examClosed && !gate.allScoresPublished) {
    return '考试状态异常，请联系管理员'
  }
  if (gate.allScoresPublished && !gate.examClosed) {
    return (gate.gradablePaperCount ?? 0) <= 0
      ? '无可评阅试卷，关考后将自动创建归档卷'
      : '成绩已全部发布，可进行关考'
  }
  if (!gate.examClosed) {
    return (gate.unpublishedBoundPaperCount ?? 0) > 0
      ? `尚有 ${gate.unpublishedBoundPaperCount} 份试卷未发布成绩，请先完成各班级发布再关考`
      : '考试未关考'
  }
  if (gate.allScoresPublished) {
    return (gate.gradablePaperCount ?? 0) <= 0 ? '无可评阅试卷，成绩门禁已满足' : '成绩已全部发布'
  }
  const unpublished = gate.unpublishedBoundPaperCount
    ?? Math.max(0, (gate.gradablePaperCount ?? 0) - (gate.publishedScoreCount ?? 0))
  return unpublished > 0
    ? `尚有 ${unpublished} 份试卷未发布成绩（${gate.publishedScoreCount ?? 0}/${gate.gradablePaperCount ?? 0}）`
    : `成绩发布 ${gate.publishedScoreCount ?? 0}/${gate.gradablePaperCount ?? 0}`
}

function resolveGateAnomaly(gate: ArchiveVolumeExamGateVO | null): boolean {
  return gate?.examClosed === true && gate.allScoresPublished !== true
}

function resolveIncompleteClasses(gate: ArchiveVolumeExamGateVO | null) {
  const progress = gate?.classPublishProgress ?? []
  return progress
    .filter(item => (item.unpublishedBoundPaperCount ?? 0) > 0)
    .map(item => ({
      classId: item.classId ?? 'unassigned',
      className: item.className?.trim() || (item.classId ? `班级 ${item.classId}` : '未分班'),
      unpublishedBoundPaperCount: item.unpublishedBoundPaperCount ?? 0,
    }))
}

export function buildCloseExamBlockedContent(gate: ArchiveVolumeExamGateVO): string {
  const unpublished = gate.unpublishedBoundPaperCount ?? 0
  const incomplete = resolveIncompleteClasses(gate)
  const lines = [`尚有 ${unpublished} 份试卷未发布最终成绩，请先完成成绩发布再关考。`]
  for (const item of incomplete.slice(0, 3)) {
    lines.push(`${item.className}：尚有 ${item.unpublishedBoundPaperCount} 份未发布`)
  }
  if (incomplete.length > 3) {
    lines.push(`另有 ${incomplete.length - 3} 个班级未完成发布`)
  }
  return lines.join('\n')
}

export function buildCloseExamReadyContent(gate: ArchiveVolumeExamGateVO): string {
  if ((gate.gradablePaperCount ?? 0) <= 0) {
    return '本场考试无可评阅试卷。关考后系统将自动创建归档卷，关闭后不可再编辑考试主信息。'
  }
  return '成绩已全部发布。关考后将自动创建归档卷，关闭后不可再编辑考试主信息。'
}
