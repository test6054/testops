/** AI 分片失败阶段 - AiTaskShardFailurePhaseEnum */
export enum AiTaskShardFailurePhaseCode {
  SHARD_INVOKE = 'SHARD_INVOKE',
  PARENT_TASK_TERMINAL = 'PARENT_TASK_TERMINAL',
  RECOVERY_AUDIT = 'RECOVERY_AUDIT',
}

export const ALL_AI_TASK_SHARD_FAILURE_PHASE_CODES: readonly AiTaskShardFailurePhaseCode[] = [
  AiTaskShardFailurePhaseCode.SHARD_INVOKE,
  AiTaskShardFailurePhaseCode.PARENT_TASK_TERMINAL,
  AiTaskShardFailurePhaseCode.RECOVERY_AUDIT,
]

export const AiTaskShardFailurePhaseDescription: Record<AiTaskShardFailurePhaseCode, string> = {
  [AiTaskShardFailurePhaseCode.SHARD_INVOKE]: '分片调用',
  [AiTaskShardFailurePhaseCode.PARENT_TASK_TERMINAL]: '父任务已终态',
  [AiTaskShardFailurePhaseCode.RECOVERY_AUDIT]: '恢复审计',
}
