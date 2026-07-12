import { strictEnumLabel } from '@/utils/strict-enum'

/** 外部数据源类型 - ExternalSourceTypeEnum；label 与后端枚举 label 逐值一致 */
export enum ExternalSourceTypeCode {
  POSTGRESQL = 'POSTGRESQL',
  MYSQL = 'MYSQL',
  ORACLE = 'ORACLE',
  SQLSERVER = 'SQLSERVER',
  DM = 'DM',
  KINGBASE = 'KINGBASE',
}

export const ALL_EXTERNAL_SOURCE_TYPE_CODES: readonly ExternalSourceTypeCode[] = [
  ExternalSourceTypeCode.POSTGRESQL,
  ExternalSourceTypeCode.MYSQL,
  ExternalSourceTypeCode.ORACLE,
  ExternalSourceTypeCode.SQLSERVER,
  ExternalSourceTypeCode.DM,
  ExternalSourceTypeCode.KINGBASE,
]

export const ExternalSourceTypeDescription: Record<ExternalSourceTypeCode, string> = {
  [ExternalSourceTypeCode.POSTGRESQL]: 'PostgreSQL',
  [ExternalSourceTypeCode.MYSQL]: 'MySQL',
  [ExternalSourceTypeCode.ORACLE]: 'Oracle',
  [ExternalSourceTypeCode.SQLSERVER]: 'SQL Server',
  [ExternalSourceTypeCode.DM]: '达梦',
  [ExternalSourceTypeCode.KINGBASE]: '人大金仓',
}

export const EXTERNAL_SOURCE_TYPE_OPTIONS: Array<{ label: string, value: ExternalSourceTypeCode }>
  = ALL_EXTERNAL_SOURCE_TYPE_CODES.map(value => ({
    value,
    label: strictEnumLabel(ExternalSourceTypeDescription, value, '外部数据源类型'),
  }))
