/** SchoolQualityDimension */
export enum SchoolQualityDimensionCode {
  COURSE = 'COURSE',
  CLASS = 'CLASS',
  SEMESTER = 'SEMESTER',
}

export const ALL_SCHOOL_QUALITY_DIMENSION_CODES: readonly SchoolQualityDimensionCode[] = [
  SchoolQualityDimensionCode.COURSE,
  SchoolQualityDimensionCode.CLASS,
  SchoolQualityDimensionCode.SEMESTER,
]

export const SchoolQualityDimensionDescription: Record<SchoolQualityDimensionCode, string> = {
  [SchoolQualityDimensionCode.COURSE]: '课程维度',
  [SchoolQualityDimensionCode.CLASS]: '班级维度',
  [SchoolQualityDimensionCode.SEMESTER]: '学期维度',
}
