/** 间接评价答卷换算状态筛选，与后端 IndirectResponseConversionFilterEnum 逐值一致 */
export enum IndirectResponseConversionFilterCode {
  PENDING = 'PENDING',
  CONVERTED = 'CONVERTED',
  NO_SUBSTANTIVE = 'NO_SUBSTANTIVE',
}

export const ALL_INDIRECT_RESPONSE_CONVERSION_FILTER_CODES: readonly IndirectResponseConversionFilterCode[] = [
  IndirectResponseConversionFilterCode.PENDING,
  IndirectResponseConversionFilterCode.CONVERTED,
  IndirectResponseConversionFilterCode.NO_SUBSTANTIVE,
]

export const IndirectResponseConversionFilterDescription: Record<IndirectResponseConversionFilterCode, string> = {
  [IndirectResponseConversionFilterCode.PENDING]: '待换算',
  [IndirectResponseConversionFilterCode.CONVERTED]: '已换算',
  [IndirectResponseConversionFilterCode.NO_SUBSTANTIVE]: '无实质作答',
}

