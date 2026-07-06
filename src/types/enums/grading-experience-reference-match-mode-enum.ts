/** AI 定标引用匹配方式，与后端 GradingExperienceReferenceMatchMode 逐值一致 */
export enum GradingExperienceReferenceMatchModeCode {
  EXPLICIT_BINDING = 'EXPLICIT_BINDING',
  SIMHASH_AUTO_MATCH = 'SIMHASH_AUTO_MATCH',
}

export const ALL_GRADING_EXPERIENCE_REFERENCE_MATCH_MODE_CODES: readonly GradingExperienceReferenceMatchModeCode[] = [
  GradingExperienceReferenceMatchModeCode.EXPLICIT_BINDING,
  GradingExperienceReferenceMatchModeCode.SIMHASH_AUTO_MATCH,
]

export const GradingExperienceReferenceMatchModeDescription: Record<GradingExperienceReferenceMatchModeCode, string> = {
  [GradingExperienceReferenceMatchModeCode.EXPLICIT_BINDING]: '显式绑定',
  [GradingExperienceReferenceMatchModeCode.SIMHASH_AUTO_MATCH]: '相似题自动匹配',
}
