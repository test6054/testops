import type { ExamWorkbenchNextActionResponse } from '@/apis/mark/exam-progress'
import type { WorkflowBlockingItem } from '@/components/workbench/workflow-readiness/types'
import type { ExamWorkflowTaskDockView } from '@/types/exam-workflow-task-dock'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import { assertKnownWorkflowBlockingCode } from '@/components/workbench/workflow-readiness/assert-blocking-code'
import { findWorkbenchNextAction } from '@/utils/exam-workspace-entry-gates'

/** 校验经验定标 nextAction.blockingItems 合同完整；缺字段即失败，禁止前端补文案。 */
function requireCalibrationBlockingItems(
  items: WorkflowBlockingItem[] | null | undefined,
): WorkflowBlockingItem[] {
  if (!items?.length) {
    throw new Error('经验定标 nextAction.blockingItems 为空')
  }
  for (const item of items) {
    assertKnownWorkflowBlockingCode(item.code, 'experienceAssistCalibration')
    if (!item.message?.trim()) {
      throw new Error(`经验定标阻断项缺少 message：${item.code}`)
    }
    if (!item.actionLabel?.trim()) {
      throw new Error(`经验定标阻断项缺少 actionLabel：${item.code}`)
    }
    if (!item.targetRouteName?.trim()) {
      throw new Error(`经验定标阻断项缺少 targetRouteName：${item.code}`)
    }
  }
  return items
}

/** 试评经验定标 nextAction 是否处于可行动待办态。 */
export function isExperienceAssistCalibrationActionPending(
  action: ExamWorkbenchNextActionResponse | undefined,
): boolean {
  return action?.enabled === true && (action.blockingItems?.length ?? 0) > 0
}

/** 从 nextActions 解析试评经验定标动作。 */
export function findExperienceAssistCalibrationAction(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
): ExamWorkbenchNextActionResponse | undefined {
  return findWorkbenchNextAction(
    nextActions,
    WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION,
  )
}

/** 由 EXPERIENCE_ASSIST_CALIBRATION nextAction 构建工作台任务条视图。 */
export function buildExperienceAssistCalibrationDockView(
  action: ExamWorkbenchNextActionResponse | undefined,
): ExamWorkflowTaskDockView | null {
  if (!isExperienceAssistCalibrationActionPending(action) || !action) {
    return null
  }
  const items = requireCalibrationBlockingItems(action.blockingItems)
  const first = items[0]
  const pendingCount = action.pendingItemCount ?? 0
  return {
    kind: 'experience-assist',
    title: '经验定标待完成',
    description: first.message,
    actionLabel: first.actionLabel,
    routeName: first.targetRouteName,
    badge: pendingCount > 0 ? `${pendingCount.toLocaleString('zh-CN')} 项` : undefined,
    overflowHint: items.length > 1 ? `还有 ${items.length - 1} 项` : undefined,
  }
}

/** 读取试评经验定标待办数：优先 nextAction.pendingItemCount。 */
export function resolveExperienceAssistCalibrationPendingCount(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
): number {
  const action = findExperienceAssistCalibrationAction(nextActions)
  if (action?.pendingItemCount != null && action.pendingItemCount > 0) {
    return action.pendingItemCount
  }
  return 0
}

/** 提交发布复核 nextAction 是否可行动。 */
export function isSubmitPublishReviewActionPending(
  action: ExamWorkbenchNextActionResponse | undefined,
): boolean {
  return action?.enabled === true && (action.pendingItemCount ?? 0) > 0
}

/** 去签审 nextAction 是否可行动。 */
export function isApprovePublishReviewActionPending(
  action: ExamWorkbenchNextActionResponse | undefined,
): boolean {
  return action?.enabled === true
    && (action.pendingItemCount ?? 0) > 0
    && action.openPendingMyPublishReview === true
}

export function findSubmitPublishReviewAction(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
): ExamWorkbenchNextActionResponse | undefined {
  return findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.SUBMIT_PUBLISH_REVIEW)
}

export function findApprovePublishReviewAction(
  nextActions: ExamWorkbenchNextActionResponse[] | null | undefined,
): ExamWorkbenchNextActionResponse | undefined {
  return findWorkbenchNextAction(nextActions, WorkbenchNextActionKeyCode.APPROVE_PUBLISH_REVIEW)
}

/** 由 SUBMIT_PUBLISH_REVIEW nextAction 构建任务条视图。 */
export function buildSubmitPublishReviewDockView(
  action: ExamWorkbenchNextActionResponse | undefined,
): ExamWorkflowTaskDockView | null {
  if (!isSubmitPublishReviewActionPending(action) || !action) {
    return null
  }
  const routeName = action.workspaceRouteName?.trim()
  const actionLabel = action.label?.trim()
  if (!routeName || !actionLabel) {
    throw new Error('提交发布复核 nextAction 缺少 workspaceRouteName 或 label')
  }
  const pendingCount = action.pendingItemCount ?? 0
  return {
    kind: 'submit-publish-review',
    title: '成绩待提交发布复核',
    description: `有 ${pendingCount.toLocaleString('zh-CN')} 份成绩可提交发布复核，签审通过后学生可见。`,
    actionLabel,
    routeName,
    badge: `${pendingCount.toLocaleString('zh-CN')} 份`,
    openPendingMyPublishReview: false,
  }
}

/** 由 APPROVE_PUBLISH_REVIEW nextAction 构建任务条视图。 */
export function buildApprovePublishReviewDockView(
  action: ExamWorkbenchNextActionResponse | undefined,
): ExamWorkflowTaskDockView | null {
  if (!isApprovePublishReviewActionPending(action) || !action) {
    return null
  }
  const routeName = action.workspaceRouteName?.trim()
  const actionLabel = action.label?.trim()
  if (!routeName || !actionLabel) {
    throw new Error('去签审 nextAction 缺少 workspaceRouteName 或 label')
  }
  if (action.openPendingMyPublishReview !== true) {
    throw new Error('去签审 nextAction 已启用但缺少 openPendingMyPublishReview=true')
  }
  const pendingCount = action.pendingItemCount ?? 0
  return {
    kind: 'approve-publish-review',
    title: '成绩待我签审',
    description: `有 ${pendingCount.toLocaleString('zh-CN')} 份成绩待您签审通过后对学生可见。`,
    actionLabel,
    routeName,
    badge: `${pendingCount.toLocaleString('zh-CN')} 份`,
    openPendingMyPublishReview: true,
  }
}
