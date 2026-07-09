/** 考试级经验辅助评阅策略状态，与后端 GradingExperienceAssistPolicyStatus 逐值一致 */
export enum GradingExperienceAssistPolicyStatusCode {
  DISABLED = 'DISABLED',
  ENABLED = 'ENABLED',
  FROZEN = 'FROZEN',
}

export const ALL_GRADING_EXPERIENCE_ASSIST_POLICY_STATUS_CODES: readonly GradingExperienceAssistPolicyStatusCode[] = [
  GradingExperienceAssistPolicyStatusCode.DISABLED,
  GradingExperienceAssistPolicyStatusCode.ENABLED,
  GradingExperienceAssistPolicyStatusCode.FROZEN,
]

export const GradingExperienceAssistPolicyStatusDescription: Record<GradingExperienceAssistPolicyStatusCode, string> = {
  [GradingExperienceAssistPolicyStatusCode.DISABLED]: '未启用',
  [GradingExperienceAssistPolicyStatusCode.ENABLED]: '已启用',
  [GradingExperienceAssistPolicyStatusCode.FROZEN]: '已冻结',
}

