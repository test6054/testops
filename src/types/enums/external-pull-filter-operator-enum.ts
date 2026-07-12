import { strictEnumLabel } from '@/utils/strict-enum'

/** 外部拔取筛选操作符 */
export enum ExternalPullFilterOperatorCode {
  EQ = 'EQ',
  NE = 'NE',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  LIKE = 'LIKE',
  IN = 'IN',
}

export const ALL_EXTERNAL_PULL_FILTER_OPERATOR_CODES: readonly ExternalPullFilterOperatorCode[] = [
  ExternalPullFilterOperatorCode.EQ,
  ExternalPullFilterOperatorCode.NE,
  ExternalPullFilterOperatorCode.GT,
  ExternalPullFilterOperatorCode.GTE,
  ExternalPullFilterOperatorCode.LT,
  ExternalPullFilterOperatorCode.LTE,
  ExternalPullFilterOperatorCode.LIKE,
  ExternalPullFilterOperatorCode.IN,
]

export const ExternalPullFilterOperatorDescription: Record<ExternalPullFilterOperatorCode, string> = {
  [ExternalPullFilterOperatorCode.EQ]: '等于',
  [ExternalPullFilterOperatorCode.NE]: '不等于',
  [ExternalPullFilterOperatorCode.GT]: '大于',
  [ExternalPullFilterOperatorCode.GTE]: '大于等于',
  [ExternalPullFilterOperatorCode.LT]: '小于',
  [ExternalPullFilterOperatorCode.LTE]: '小于等于',
  [ExternalPullFilterOperatorCode.LIKE]: '包含',
  [ExternalPullFilterOperatorCode.IN]: '属于多个值',
}

export const EXTERNAL_PULL_FILTER_OPERATOR_OPTIONS: Array<{
  value: ExternalPullFilterOperatorCode
  label: string
}> = ALL_EXTERNAL_PULL_FILTER_OPERATOR_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ExternalPullFilterOperatorDescription, value, '外部拔取筛选操作符'),
}))
