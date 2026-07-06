/** 量表类型 - ScaleTypeEnum */
export enum ScaleTypeCode {
  FIVE_LEVEL = 'FIVE_LEVEL',
  FOUR_LEVEL = 'FOUR_LEVEL',
  TEN_POINT = 'TEN_POINT',
  PERCENTAGE = 'PERCENTAGE',
  CUSTOM = 'CUSTOM',
}

export const ALL_SCALE_TYPE_CODES: readonly ScaleTypeCode[] = [
  ScaleTypeCode.FIVE_LEVEL,
  ScaleTypeCode.FOUR_LEVEL,
  ScaleTypeCode.TEN_POINT,
  ScaleTypeCode.PERCENTAGE,
  ScaleTypeCode.CUSTOM,
]

export const ScaleTypeDescription: Record<ScaleTypeCode, string> = {
  [ScaleTypeCode.FIVE_LEVEL]: '五级量表',
  [ScaleTypeCode.FOUR_LEVEL]: '四级量表',
  [ScaleTypeCode.TEN_POINT]: '十分量表',
  [ScaleTypeCode.PERCENTAGE]: '百分量表',
  [ScaleTypeCode.CUSTOM]: '自定义量表',
}
