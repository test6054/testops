/** AiAbility */
export enum AiAbilityCode {
  PAPER_GRADE_SUGGESTION = 'PAPER_GRADE_SUGGESTION',
  SUBJECTIVE_GRADE_SUGGESTION = 'SUBJECTIVE_GRADE_SUGGESTION',
}

export const ALL_AI_ABILITY_CODES: readonly AiAbilityCode[] = [
  AiAbilityCode.PAPER_GRADE_SUGGESTION,
  AiAbilityCode.SUBJECTIVE_GRADE_SUGGESTION,
]

export const AiAbilityDescription: Record<AiAbilityCode, string> = {
  [AiAbilityCode.PAPER_GRADE_SUGGESTION]: '整卷 AI 批阅',
  [AiAbilityCode.SUBJECTIVE_GRADE_SUGGESTION]: '单题 AI 复评',
}

