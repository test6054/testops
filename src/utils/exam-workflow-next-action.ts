import type { ExamWorkbenchNextActionResponse } from '@/apis/mark/exam-progress'
import type { ExamWorkflowTaskDockView } from '@/types/exam-workflow-task-dock'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import { findWorkbenchNextAction } from '@/utils/exam-workspace-entry-gates'

/** 试评经验定标 nextAction 是否处于可行动待办态。 */
export function isExperienceAssistCalibrationActionPending(
  action: ExamWorkbenchNextActionResponse | undefined,
): boolean {
  return Boolean(action?.enabled && action.actionPrompts?.length)
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
  const prompts = action.actionPrompts ?? []
  const pendingCount = action.pendingItemCount ?? 0
  return {
    kind: 'experience-assist',
    title: '经验定标待完成',
    description: prompts[0] ?? '试评阶段须完成经验辅助定标后再进入正评',
    actionLabel: action.label,
    badge: pendingCount > 0 ? `${pendingCount.toLocaleString('zh-CN')} 项` : undefined,
    overflowHint: prompts.length > 1 ? `还有 ${prompts.length - 1} 项` : undefined,
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
