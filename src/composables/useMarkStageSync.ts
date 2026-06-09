import type { ExamDetailVO, ExamStatusCode, MarkingProgressVO } from '@/apis/mark/exam'
import type { MarkStageKey, SelectedExamMeta } from '@/stores/modules/markStage'
import type { WorkbenchStageStatus } from '@/types/workbench'
import { MARK_STAGE_ORDER, useMarkStageStore } from '@/stores/modules/markStage'

/** 准备步骤快照，供阶段推导消费 */
export interface MarkPrepStepSnapshot {
  key: string
  status: WorkbenchStageStatus
  statusText: string
}

export function deriveMarkStageBulkUpdate(
  prepSteps: MarkPrepStepSnapshot[],
  advisoryReasons: string[],
  progress: MarkingProgressVO | null,
  examStatus?: ExamStatusCode,
): Partial<Record<MarkStageKey, { status: WorkbenchStageStatus, hint?: string }>> {
  const completedCount = prepSteps.filter((s) => s.status === 'completed').length
  const pendingCount = prepSteps.filter(
    (s) => s.status === 'warning' || s.status === 'active',
  ).length
  const allCompleted = prepSteps.length > 0 && completedCount === prepSteps.length
  const examPrepStatus: WorkbenchStageStatus = allCompleted
    ? 'completed'
    : pendingCount > 0
      ? 'warning'
      : 'active'
  const examPrepHint
    = advisoryReasons[0]
      ?? (allCompleted
        ? `准备全部就绪（${completedCount}/${prepSteps.length}）`
        : prepSteps.length > 0
          ? `准备进度 ${completedCount}/${prepSteps.length}`
          : '选择制卷形态并完善准备项')

  const layoutStep = prepSteps.find((s) => s.key === 'answerSheet' || s.key === 'paperMaster')

  const scanAttention = progress?.scanAttentionCount ?? 0
  const paperCount = progress?.paperCount ?? 0
  const gradable = progress?.gradablePaperCount ?? 0
  const totalGrades = progress?.totalQuestionGradeCount ?? 0
  const confirmed = progress?.confirmedQuestionGradeCount ?? 0
  const pendingReview = progress?.pendingReviewTaskCount ?? 0
  const inProgressReview = progress?.inProgressReviewTaskCount ?? 0
  const openProcessing = progress?.openProcessingTaskCount ?? 0
  const unconfirmed = Math.max(0, totalGrades - confirmed)
  const reviewActive = pendingReview + inProgressReview

  let scanStatus: WorkbenchStageStatus = 'pending'
  let scanHint = '扫描 / OCR / 异常'
  if (scanAttention > 0) {
    scanStatus = 'warning'
    scanHint = `${scanAttention} 条异常待处理`
  } else if (paperCount > 0) {
    scanStatus = gradable > 0 ? 'completed' : 'active'
    scanHint = gradable > 0 ? `已绑定 ${gradable} 份可阅卷` : `已录入 ${paperCount} 份卷面`
  }

  let orgStatus: WorkbenchStageStatus = 'pending'
  let orgHint = '题组 / 教师 / 试阅'
  if (totalGrades > 0 || reviewActive > 0) {
    orgStatus = 'completed'
    orgHint = '阅卷安排已启动'
  } else if (gradable > 0) {
    orgStatus = 'active'
    orgHint = '可创建阅卷组织并分派'
  }

  let trialStatus: WorkbenchStageStatus = 'pending'
  let trialHint = '试评校准'
  if (reviewActive > 0 && confirmed < totalGrades) {
    trialStatus = 'active'
    trialHint = '试评 / 正评会话进行中'
  } else if (totalGrades > 0 && confirmed >= totalGrades) {
    trialStatus = 'completed'
    trialHint = '试评 / 正评已完成'
  }

  let formalStatus: WorkbenchStageStatus = 'pending'
  let formalHint = '阅卷任务池'
  if (reviewActive > 0) {
    formalStatus = 'active'
    formalHint = `${reviewActive} 份待批 / 进行中`
  } else if (totalGrades > 0 && confirmed >= totalGrades) {
    formalStatus = 'completed'
    formalHint = '题目批阅已完成'
  } else if (totalGrades > 0) {
    formalStatus = 'active'
    formalHint = `${confirmed}/${totalGrades} 题已确认`
  }

  let scoreStatus: WorkbenchStageStatus = 'pending'
  let scoreHint = '确认 / 发布'
  if (unconfirmed > 0) {
    scoreStatus = 'active'
    scoreHint = `${unconfirmed} 题待确认成绩`
  } else if (totalGrades > 0 && confirmed === totalGrades) {
    scoreStatus = 'active'
    scoreHint = '可进入成绩确认与发布'
  }

  const reviewStatus: WorkbenchStageStatus = openProcessing > 0 ? 'active' : 'pending'
  const reviewHint = openProcessing > 0 ? `${openProcessing} 个复核待处理` : '复核 / 申诉'

  const archiveStatus: WorkbenchStageStatus = examStatus === 'CLOSED' ? 'completed' : 'pending'
  const archiveHint = examStatus === 'CLOSED' ? '考试已关闭' : '归档 / 质量评价'

  return {
    EXAM_PREP: { status: examPrepStatus, hint: examPrepHint },
    PAPER_TEMPLATE: layoutStep
      ? { status: layoutStep.status, hint: layoutStep.statusText }
      : { status: 'pending', hint: '制卷与模板' },
    SCAN: { status: scanStatus, hint: scanHint },
    MARKING_ORG: { status: orgStatus, hint: orgHint },
    TRIAL_MARK: { status: trialStatus, hint: trialHint },
    FORMAL_MARK: { status: formalStatus, hint: formalHint },
    SCORE_PUBLISH: { status: scoreStatus, hint: scoreHint },
    GRADE_REVIEW: { status: reviewStatus, hint: reviewHint },
    ARCHIVE: { status: archiveStatus, hint: archiveHint },
  }
}

export function resolveCurrentMarkStageKey(
  updates: Partial<Record<MarkStageKey, { status: WorkbenchStageStatus, hint?: string }>>,
): MarkStageKey {
  let lastActiveOrWarning: MarkStageKey | null = null
  for (const key of MARK_STAGE_ORDER) {
    const status = updates[key]?.status
    if (status === 'active' || status === 'warning') {
      lastActiveOrWarning = key
    }
  }
  if (lastActiveOrWarning) {
    return lastActiveOrWarning
  }
  for (const key of MARK_STAGE_ORDER) {
    const status = updates[key]?.status
    if (status !== 'completed') {
      return key
    }
  }
  return 'ARCHIVE'
}

export function buildSelectedExamMeta(detail: ExamDetailVO): SelectedExamMeta {
  return {
    examId: detail.examId,
    examName: detail.examName,
    examNo: detail.examNo,
  }
}

/**
 * 将考试详情 + 阅卷进度 API 写入 markStageStore，供驾驶舱 StageRail 与各页共享。
 */
export function applyMarkStageFromExamProgress(
  examId: string,
  prepSteps: MarkPrepStepSnapshot[],
  advisoryReasons: string[],
  progress: MarkingProgressVO | null,
  detail?: ExamDetailVO | null,
): void {
  const markStageStore = useMarkStageStore()
  const updates = deriveMarkStageBulkUpdate(
    prepSteps,
    advisoryReasons,
    progress,
    detail?.status,
  )
  markStageStore.bulkUpdate(examId, updates)
  markStageStore.setCurrentStage(examId, resolveCurrentMarkStageKey(updates))
  if (detail) {
    markStageStore.setSelectedExamMeta(buildSelectedExamMeta(detail))
  }
}
