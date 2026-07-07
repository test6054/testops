/** 五育维度 - CivicDimension */
export enum CivicDimensionCode {
  MORAL = 'MORAL',
  INTELLECTUAL = 'INTELLECTUAL',
  PHYSICAL = 'PHYSICAL',
  AESTHETIC = 'AESTHETIC',
  LABOR = 'LABOR',
}

export const ALL_CIVIC_DIMENSION_CODES: readonly CivicDimensionCode[] = [
  CivicDimensionCode.MORAL,
  CivicDimensionCode.INTELLECTUAL,
  CivicDimensionCode.PHYSICAL,
  CivicDimensionCode.AESTHETIC,
  CivicDimensionCode.LABOR,
]

export const CivicDimensionDescription: Record<CivicDimensionCode, string> = {
  [CivicDimensionCode.MORAL]: '德',
  [CivicDimensionCode.INTELLECTUAL]: '智',
  [CivicDimensionCode.PHYSICAL]: '体',
  [CivicDimensionCode.AESTHETIC]: '美',
  [CivicDimensionCode.LABOR]: '劳',
}
