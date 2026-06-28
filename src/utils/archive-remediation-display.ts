import type { ArchiveRemediationTaskVO } from '@/apis/mark/archive-volume'

/**
 * 整改任务责任人展示名；有 assigneeUserId 但缺 nickName 时显式失败，避免 UI 兜底掩盖契约漂移。
 */
export function remediationAssigneeLabel(task: ArchiveRemediationTaskVO) {
  if (!task.assigneeUserId) {
    return '—'
  }
  if (!task.assigneeNickName?.trim()) {
    throw new Error(`整改任务缺少 assigneeNickName 契约：taskId=${task.taskId}`)
  }
  return task.assigneeNickName
}

/**
 * 详情/横幅用的一句责任人摘要；无 assignee 时返回 null。
 */
export function remediationAssigneeSummary(task: ArchiveRemediationTaskVO | null | undefined) {
  if (!task?.assigneeUserId) {
    return null
  }
  return `责任人 ${remediationAssigneeLabel(task)}`
}
