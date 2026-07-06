import type { AgentHealthResponse } from '@/apis/mark/scanner-agent-local'

export const ACTIVATION_BLOCKED_BY_SCAN_JOB = '当前扫描任务未结束，不能重新激活一体机'

/** Agent 本地或服务端是否存在仍占用工作台的扫描任务（与 exam currentJobBlocksWorkspace 对齐）。 */
export function isAgentWorkspaceBlocked(health: AgentHealthResponse | null | undefined): boolean {
  if (health?.workspaceBlocked === true) {
    return true
  }
  return (health?.pendingUploadJobs ?? 0) > 0
}

export function resolveActivationGuardMessage(
  health: AgentHealthResponse | null | undefined,
): string | null {
  if (isAgentWorkspaceBlocked(health)) {
    return ACTIVATION_BLOCKED_BY_SCAN_JOB
  }
  return null
}

/** 三域共用：Agent health + 考试链本地 job / orphan session 阻断。 */
export function resolveKioskActivationGuardMessage(options: {
  health: AgentHealthResponse | null | undefined
  currentJobBlocksWorkspace?: boolean
}): string | null {
  const healthBlock = resolveActivationGuardMessage(options.health)
  if (healthBlock) {
    return healthBlock
  }
  if (options.currentJobBlocksWorkspace) {
    return ACTIVATION_BLOCKED_BY_SCAN_JOB
  }
  return null
}
