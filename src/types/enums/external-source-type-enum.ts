/** 外部数据源类型 - ExternalSourceTypeEnum */
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
