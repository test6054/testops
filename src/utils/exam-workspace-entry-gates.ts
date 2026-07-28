import type {
  ExamWorkbenchNextActionResponse,
  MarkingProgressResponse,
} from '@/apis/mark/exam-progress'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'

export function findWorkbenchNextAction(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
  actionKey: WorkbenchNextActionKeyCode,
): ExamWorkbenchNextActionResponse | undefined {
  return nextActions?.find((item) => item.actionKey === actionKey)
}

/**
 * 是否允许从准备页进入扫描登记：仅看 START_SCAN 合同 enabled；
 * 缺 nextAction 时 fail-closed。制卷/名册硬阻断不再参与。
 */
export function canStartScanRegistration(
  nextActions?: ExamWorkbenchNextActionResponse[] | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.START_SCAN)
  // MVR-987：仅认 BE nextAction.enabled===true；缺 nextAction fail-closed
  if (!action) {
    return false
  }
  return action.enabled === true
}

/** 是否允许进入批量复核：消费后端 nextActions.ENTER_REVIEW */
export function canEnterReviewBatch(
  nextActions?: ExamWorkbenchNextActionResponse[] | null,
  _progress?: MarkingProgressResponse | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.ENTER_REVIEW)
  // MVR-987：仅认 BE nextAction.enabled===true；缺 nextAction fail-closed
  if (!action) {
    return false
  }
  return action.enabled === true
}

/** 是否可提交发布复核：消费后端 nextActions.SUBMIT_PUBLISH_REVIEW */
export function canSubmitPublishReview(
  nextActions?: ExamWorkbenchNextActionResponse[] | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.SUBMIT_PUBLISH_REVIEW)
  if (!action) {
    return false
  }
  return action.enabled === true
}

/** 是否可签审待我复核：消费后端 nextActions.APPROVE_PUBLISH_REVIEW */
export function canApprovePublishReview(
  nextActions?: ExamWorkbenchNextActionResponse[] | null,
): boolean {
  const action = findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.APPROVE_PUBLISH_REVIEW)
  if (!action) {
    return false
  }
  return action.enabled === true && action.openPendingMyPublishReview === true
}

export function resolveNextActionDisabledReason(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
  actionKey: WorkbenchNextActionKeyCode,
): string | undefined {
  const action = findWorkbenchNextAction(nextActions, actionKey)
  if (!action || action.enabled === true) {
    return undefined
  }
  return action.disabledReason
}

/**
 * 解析完整 nextAction 跳转路由。
 * 定标已启用：采信 blockingItems[0].targetRouteName；
 * 其余（含定标未启用）：采信后端 workspaceRouteName，禁止 FE 平行路由表。
 */
export function resolveWorkbenchNextActionRouteName(
  action: ExamWorkbenchNextActionResponse,
): string {
  if (action.actionKey === WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION
    && action.enabled === true) {
    const route = action.blockingItems?.[0]?.targetRouteName?.trim()
    if (!route) {
      throw new Error('经验定标 nextAction 已启用但缺少 blockingItems[0].targetRouteName')
    }
    return route
  }
  const route = action.workspaceRouteName?.trim()
  if (!route) {
    throw new Error(`nextAction 缺少 workspaceRouteName：${action.actionKey}`)
  }
  return route
}

/**
 * 解析完整 nextAction 主按钮文案。
 * 经验定标已启用时必须采信 blockingItems[0].actionLabel，禁止回落 nextAction.label。
 */
export function resolveWorkbenchNextActionLabel(
  action: ExamWorkbenchNextActionResponse,
): string {
  if (action.actionKey === WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION
    && action.enabled === true) {
    const label = action.blockingItems?.[0]?.actionLabel?.trim()
    if (!label) {
      throw new Error('经验定标 nextAction 已启用但缺少 blockingItems[0].actionLabel')
    }
    return label
  }
  if (!action.label?.trim()) {
    throw new Error(`nextAction 缺少 label：${action.actionKey}`)
  }
  return action.label.trim()
}

/**
 * 解析列表行进入路由：只认后端 workspaceRouteName 合同，禁止前端进度启发或平行路由表。
 */
export function requireExamEntryWorkspaceRouteName(exam: {
  examId?: string | number
  workspaceRouteName?: string
}): string {
  const routeName = exam.workspaceRouteName?.trim()
  if (!routeName) {
    throw new Error(`考试 ${exam.examId ?? '—'} 缺少 workspaceRouteName 合同字段`)
  }
  return routeName
}

/** 按教师端六步旅程定义解析顺序，用于侧栏建议阶段前后比较。 */
export function resolveJourneyIndex(journeyKey: ExamJourneyKey): number {
  const journeyOrder: ExamJourneyKey[] = [
    MarkTeacherDashboardJourneyKeyCode.PREP,
    MarkTeacherDashboardJourneyKeyCode.SCAN,
    MarkTeacherDashboardJourneyKeyCode.ASSIGN,
    MarkTeacherDashboardJourneyKeyCode.MARK,
    MarkTeacherDashboardJourneyKeyCode.PUBLISH,
    MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
  ]
  return journeyOrder.indexOf(journeyKey)
}
