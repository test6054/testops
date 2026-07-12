import type { ArchiveRemediationTaskResponse } from '@/apis/mark/archive-volume'

export function remediationAssigneeLabel(task: ArchiveRemediationTaskResponse) {
  if (!task.assigneeUserId) {
    return '—'
  }
  return task.assigneeNickName?.trim() || `用户 ${task.assigneeUserId}`
}

export function remediationCreatorLabel(task: ArchiveRemediationTaskResponse) {
  if (!task.createUserId) {
    return '—'
  }
  return task.createUserNickName?.trim() || `用户 ${task.createUserId}`
}

/**
 * 详情/横幅用的一句责任人摘要；无 assignee 时返回 null。
 */
export function remediationAssigneeSummary(task: ArchiveRemediationTaskResponse | null | undefined) {
  if (!task?.assigneeUserId) {
    return null
  }
  return `责任人 ${remediationAssigneeLabel(task)}`
}
