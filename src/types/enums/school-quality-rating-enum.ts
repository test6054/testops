/** SchoolQualityRating */
export enum SchoolQualityRatingCode {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  ACCEPTABLE = 'ACCEPTABLE',
  POOR = 'POOR',
}

export const ALL_SCHOOL_QUALITY_RATING_CODES: readonly SchoolQualityRatingCode[] = [
  SchoolQualityRatingCode.EXCELLENT,
  SchoolQualityRatingCode.GOOD,
  SchoolQualityRatingCode.ACCEPTABLE,
  SchoolQualityRatingCode.POOR,
]

export const SchoolQualityRatingDescription: Record<SchoolQualityRatingCode, string> = {
  [SchoolQualityRatingCode.EXCELLENT]: '优秀',
  [SchoolQualityRatingCode.GOOD]: '良好',
  [SchoolQualityRatingCode.ACCEPTABLE]: '可接受',
  [SchoolQualityRatingCode.POOR]: '较差',
}

