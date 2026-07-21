/** AI 任务失败阶段 - AiTaskFailurePhaseEnum */
export enum AiTaskFailurePhaseCode {
  INIT = 'INIT',
  BUILD_BUSINESS_PAYLOAD = 'BUILD_BUSINESS_PAYLOAD',
  BUILD_INSTITUTION_CONTEXT = 'BUILD_INSTITUTION_CONTEXT',
  BUILD_PROMPT = 'BUILD_PROMPT',
  SAVE_PROMPT_AND_MASK = 'SAVE_PROMPT_AND_MASK',
  MODEL_CALL = 'MODEL_CALL',
  OUTPUT_SENSITIVE_CHECK = 'OUTPUT_SENSITIVE_CHECK',
  PARSE_RESULT = 'PARSE_RESULT',
  PERSIST_SUCCESS = 'PERSIST_SUCCESS',
  RECOVERY_AUDIT = 'RECOVERY_AUDIT',
  STALE_PROCESSING_RECOVERY = 'STALE_PROCESSING_RECOVERY',
}

export const ALL_AI_TASK_FAILURE_PHASE_CODES: readonly AiTaskFailurePhaseCode[] = [
  AiTaskFailurePhaseCode.INIT,
  AiTaskFailurePhaseCode.BUILD_BUSINESS_PAYLOAD,
  AiTaskFailurePhaseCode.BUILD_INSTITUTION_CONTEXT,
  AiTaskFailurePhaseCode.BUILD_PROMPT,
  AiTaskFailurePhaseCode.SAVE_PROMPT_AND_MASK,
  AiTaskFailurePhaseCode.MODEL_CALL,
  AiTaskFailurePhaseCode.OUTPUT_SENSITIVE_CHECK,
  AiTaskFailurePhaseCode.PARSE_RESULT,
  AiTaskFailurePhaseCode.PERSIST_SUCCESS,
  AiTaskFailurePhaseCode.RECOVERY_AUDIT,
  AiTaskFailurePhaseCode.STALE_PROCESSING_RECOVERY,
]

export const AiTaskFailurePhaseDescription: Record<AiTaskFailurePhaseCode, string> = {
  [AiTaskFailurePhaseCode.INIT]: '初始化',
  [AiTaskFailurePhaseCode.BUILD_BUSINESS_PAYLOAD]: '装配业务材料',
  [AiTaskFailurePhaseCode.BUILD_INSTITUTION_CONTEXT]: '装配院校上下文',
  [AiTaskFailurePhaseCode.BUILD_PROMPT]: '构建提示词',
  [AiTaskFailurePhaseCode.SAVE_PROMPT_AND_MASK]: '保存提示词与脱敏映射',
  [AiTaskFailurePhaseCode.MODEL_CALL]: '模型调用',
  [AiTaskFailurePhaseCode.OUTPUT_SENSITIVE_CHECK]: '输出敏感检查',
  [AiTaskFailurePhaseCode.PARSE_RESULT]: '解析结果',
  [AiTaskFailurePhaseCode.PERSIST_SUCCESS]: '持久化成功结果',
  [AiTaskFailurePhaseCode.RECOVERY_AUDIT]: '恢复审计',
  [AiTaskFailurePhaseCode.STALE_PROCESSING_RECOVERY]: '陈旧处理中恢复',
}
