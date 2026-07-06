/** 主观题经验定标就绪状态，与后端 GradingExperienceAssistQuestionResolution 逐值一致 */
export enum GradingExperienceAssistQuestionResolutionCode {
  BASELINE_MISSING = 'BASELINE_MISSING',
  EXPLICIT_BOUND = 'EXPLICIT_BOUND',
  AUTO_MATCH_READY = 'AUTO_MATCH_READY',
  NEEDS_EXPLICIT_BINDING = 'NEEDS_EXPLICIT_BINDING',
}

export const GradingExperienceAssistQuestionResolutionDescription: Record<
  GradingExperienceAssistQuestionResolutionCode,
  string
> = {
  [GradingExperienceAssistQuestionResolutionCode.BASELINE_MISSING]: '标答基线未锁定',
  [GradingExperienceAssistQuestionResolutionCode.EXPLICIT_BOUND]: '已显式绑定',
  [GradingExperienceAssistQuestionResolutionCode.AUTO_MATCH_READY]: '可自动匹配',
  [GradingExperienceAssistQuestionResolutionCode.NEEDS_EXPLICIT_BINDING]: '待显式绑定',
}

export const GradingExperienceAssistQuestionResolutionTone: Record<
  GradingExperienceAssistQuestionResolutionCode,
  'green' | 'blue' | 'orange' | 'red'
> = {
  [GradingExperienceAssistQuestionResolutionCode.BASELINE_MISSING]: 'red',
  [GradingExperienceAssistQuestionResolutionCode.EXPLICIT_BOUND]: 'green',
  [GradingExperienceAssistQuestionResolutionCode.AUTO_MATCH_READY]: 'blue',
  [GradingExperienceAssistQuestionResolutionCode.NEEDS_EXPLICIT_BINDING]: 'orange',
}

export function isGradingExperienceAssistQuestionReady(
  status?: GradingExperienceAssistQuestionResolutionCode,
): boolean {
  return status === GradingExperienceAssistQuestionResolutionCode.EXPLICIT_BOUND
    || status === GradingExperienceAssistQuestionResolutionCode.AUTO_MATCH_READY
}
