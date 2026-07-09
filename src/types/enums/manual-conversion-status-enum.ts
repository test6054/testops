/**
 * 间接评价答卷人工换算物化状态
 * 取值与展示文案以后端 {@code ManualConversionStatusEnum} 为真源，须逐值同步。
 */

export enum ManualConversionStatusCode {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  NO_SUBSTANTIVE = 'NO_SUBSTANTIVE',
  PENDING = 'PENDING',
  CONVERTED = 'CONVERTED',
}

export const ALL_MANUAL_CONVERSION_STATUS_CODES: readonly ManualConversionStatusCode[] = [
  ManualConversionStatusCode.NOT_APPLICABLE,
  ManualConversionStatusCode.NO_SUBSTANTIVE,
  ManualConversionStatusCode.PENDING,
  ManualConversionStatusCode.CONVERTED,
]

/** 与后端 ManualConversionStatusEnum.label 一致 */
export const ManualConversionStatusDescription: Record<ManualConversionStatusCode, string> = {
  [ManualConversionStatusCode.NOT_APPLICABLE]: '不适用',
  [ManualConversionStatusCode.NO_SUBSTANTIVE]: '无实质作答',
  [ManualConversionStatusCode.PENDING]: '待换算',
  [ManualConversionStatusCode.CONVERTED]: '已换算',
}

const STATUS_SET = new Set<string>(Object.values(ManualConversionStatusCode))

export function isManualConversionStatus(
  value: string | null | undefined,
): value is ManualConversionStatusCode {
  return value != null && STATUS_SET.has(value)
}
