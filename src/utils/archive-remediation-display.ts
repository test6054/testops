import type { ArchiveRemediationTaskVO } from '@/apis/mark/archive-volume'

export function remediationAssigneeLabel(task: ArchiveRemediationTaskVO) {
  if (!task.assigneeUserId) {
    return '—'
  }
  return task.assigneeNickName?.trim() || `用户 ${task.assigneeUserId}`
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
