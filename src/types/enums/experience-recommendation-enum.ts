/** ExperienceRecommendation */
export enum ExperienceRecommendationCode {
  KEEP = 'KEEP',
  UPDATE = 'UPDATE',
  DEPRECATE = 'DEPRECATE',
}

export const ALL_EXPERIENCE_RECOMMENDATION_CODES: readonly ExperienceRecommendationCode[] = [
  ExperienceRecommendationCode.KEEP,
  ExperienceRecommendationCode.UPDATE,
  ExperienceRecommendationCode.DEPRECATE,
]

export const ExperienceRecommendationDescription: Record<ExperienceRecommendationCode, string> = {
  [ExperienceRecommendationCode.KEEP]: '维持',
  [ExperienceRecommendationCode.UPDATE]: '更新',
  [ExperienceRecommendationCode.DEPRECATE]: '废弃',
}

