/** SchoolQualityItemDimension */
export enum SchoolQualityItemDimensionCode {
  TEACHING = 'TEACHING',
  QUESTION_DESIGN = 'QUESTION_DESIGN',
  SCORE_DISTRIBUTION = 'SCORE_DISTRIBUTION',
}

export const ALL_SCHOOL_QUALITY_ITEM_DIMENSION_CODES: readonly SchoolQualityItemDimensionCode[] = [
  SchoolQualityItemDimensionCode.TEACHING,
  SchoolQualityItemDimensionCode.QUESTION_DESIGN,
  SchoolQualityItemDimensionCode.SCORE_DISTRIBUTION,
]

export const SchoolQualityItemDimensionDescription: Record<SchoolQualityItemDimensionCode, string> = {
  [SchoolQualityItemDimensionCode.TEACHING]: '教学质量',
  [SchoolQualityItemDimensionCode.QUESTION_DESIGN]: '命题质量',
  [SchoolQualityItemDimensionCode.SCORE_DISTRIBUTION]: '成绩分布',
}

