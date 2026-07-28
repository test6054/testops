import type { Ref } from 'vue'
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { ExamCloseReadinessResponse } from '@/apis/mark/exam'
import { computed } from 'vue'

export function useExamArchiveGateHint(gate: Ref<ArchiveVolumeExamGateResponse | null>) {
  const gateProgressHint = computed(() => resolveGateProgressHint(gate.value))
  const gateAnomaly = computed(() => resolveGateAnomaly(gate.value))
  const incompleteClasses = computed(() => resolveIncompleteClasses(gate.value))

  return {
    gateProgressHint,
    gateAnomaly,
    incompleteClasses,
  }
}

function resolveGateProgressHint(gate: ArchiveVolumeExamGateResponse | null): string {
  if (!gate) {
    return '—'
  }
  if (gate.gateOpen === true) {
    return '已完成'
  }
  if (gate.examClosed === true && gate.closeReadiness.closePrerequisitesSatisfied !== true) {
    return `考试已关闭但业务前置条件异常：${gate.closeReadiness.blockingItems[0]?.message ?? '请联系管理员处理'}`
  }
  if (gate.examClosed === true && gate.allScoresPublished !== true) {
    return '考试状态异常，请联系管理员'
  }
  if (gate.examClosed !== true && gate.closeReadiness.closeExamReady !== true) {
    return gate.closeReadiness.blockingItems[0]?.message ?? '关考前置条件尚未完成'
  }
  if (gate.allScoresPublished === true && gate.examClosed !== true) {
    return '关考前置条件已完成，可进行关考'
  }
  if (gate.examClosed !== true) {
    return (gate.unpublishedBoundPaperCount ?? 0) > 0
      ? `尚有 ${gate.unpublishedBoundPaperCount} 份试卷未发布成绩，请先完成各班级发布再关考`
      : '考试未关考'
  }
  if (gate.allScoresPublished === true) {
    return (gate.gradablePaperCount ?? 0) <= 0 ? '无可评阅试卷，成绩门禁已满足' : '成绩已全部发布'
  }
  const unpublished
    = gate.unpublishedBoundPaperCount
      ?? Math.max(0, (gate.gradablePaperCount ?? 0) - (gate.publishedScoreCount ?? 0))
  return unpublished > 0
    ? `尚有 ${unpublished} 份试卷未发布成绩（${gate.publishedScoreCount ?? 0}/${gate.gradablePaperCount ?? 0}）`
    : `成绩发布 ${gate.publishedScoreCount ?? 0}/${gate.gradablePaperCount ?? 0}`
}

function resolveGateAnomaly(gate: ArchiveVolumeExamGateResponse | null): boolean {
  return gate?.examClosed === true
    && (gate.allScoresPublished !== true || gate.closeReadiness.closePrerequisitesSatisfied !== true)
}

function resolveIncompleteClasses(gate: ArchiveVolumeExamGateResponse | null) {
  const progress = gate?.classPublishProgress ?? []
  return progress
    .filter((item) => (item.unpublishedBoundPaperCount ?? 0) > 0)
    .map((item) => ({
      classId: item.classId ?? 'unassigned',
      className: item.className?.trim() || (item.classId ? `班级 ${item.classId}` : '未分班'),
      unpublishedBoundPaperCount: item.unpublishedBoundPaperCount ?? 0,
    }))
}

export function buildCloseExamBlockedContent(readiness: ExamCloseReadinessResponse): string {
  if (readiness.blockingItems.length === 0) {
    return readiness.examStatus === 'CLOSED'
      ? '考试已关闭，无需重复关考。'
      : '考试当前状态不可关考，请刷新列表后重试。'
  }
  return readiness.blockingItems.map(item => item.message).join('\n')
}

export function buildCloseExamReadyContent(readiness: ExamCloseReadinessResponse): string {
  const scoreSummary = readiness.gradablePaperCount <= 0
    ? '本场考试应考名册已通过缺考政策完成闭合。'
    : `本场 ${readiness.gradablePaperCount} 份可评阅试卷成绩已全部发布。`
  return `${scoreSummary}复核窗口与申请均已结案，关考后将自动创建归档卷且不可再编辑考试主信息。`
}

/** 归档双门禁：关考条件说明（禁止暴露 API 路径） */
export function buildExamClosedGateHint(gate: ArchiveVolumeExamGateResponse): string {
  if (gate.examClosed === true && gate.closeReadiness.closePrerequisitesSatisfied !== true) {
    return gate.closeReadiness.blockingItems[0]?.message ?? '考试已关闭但关考前置条件异常'
  }
  if (gate.examClosed === true) {
    return '已在考试列表完成关考'
  }
  if (gate.closeReadiness.closeExamReady === true) {
    return '成绩已全部发布，请前往考试列表执行关考'
  }
  if (gate.closeReadiness.blockingItems.length) {
    return gate.closeReadiness.blockingItems[0].message
  }
  if ((gate.unpublishedBoundPaperCount ?? 0) > 0) {
    return '请先完成全部成绩发布，再在考试列表执行关考'
  }
  return '考试未关考，需先完成成绩发布与关考'
}

/** 归档双门禁：成绩发布条件说明 */
export function buildScoresPublishedGateHint(gate: ArchiveVolumeExamGateResponse): string {
  const published = gate.publishedScoreCount ?? 0
  const total = gate.gradablePaperCount ?? 0
  if (gate.allScoresPublished === true) {
    return total <= 0
      ? '无可评阅试卷，成绩门禁已满足'
      : `全部考生成绩已发布（${published}/${total}）`
  }
  const unpublished = gate.unpublishedBoundPaperCount ?? Math.max(0, total - published)
  if (unpublished > 0) {
    return `尚有 ${unpublished} 份未发布，请前往成绩确认与发布页完成发布`
  }
  return total > 0 ? `成绩发布进度 ${published}/${total}` : '暂无可评阅试卷'
}
