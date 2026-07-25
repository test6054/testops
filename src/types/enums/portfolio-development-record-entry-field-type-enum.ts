export enum PortfolioDevelopmentRecordEntryFieldTypeCode {
  TEXT = 'TEXT',
  DATE = 'DATE',
  ENUM = 'ENUM',
  FILE = 'FILE',
  STATUS = 'STATUS',
}

export const ALL_PORTFOLIO_DEVELOPMENT_RECORD_ENTRY_FIELD_TYPE_CODES:
  readonly PortfolioDevelopmentRecordEntryFieldTypeCode[] = [
    PortfolioDevelopmentRecordEntryFieldTypeCode.TEXT,
    PortfolioDevelopmentRecordEntryFieldTypeCode.DATE,
    PortfolioDevelopmentRecordEntryFieldTypeCode.ENUM,
    PortfolioDevelopmentRecordEntryFieldTypeCode.FILE,
    PortfolioDevelopmentRecordEntryFieldTypeCode.STATUS,
  ]

export const PortfolioDevelopmentRecordEntryFieldTypeDescription: Record<
  PortfolioDevelopmentRecordEntryFieldTypeCode,
  string
> = {
  [PortfolioDevelopmentRecordEntryFieldTypeCode.TEXT]: '文本',
  [PortfolioDevelopmentRecordEntryFieldTypeCode.DATE]: '日期',
  [PortfolioDevelopmentRecordEntryFieldTypeCode.ENUM]: '枚举',
  [PortfolioDevelopmentRecordEntryFieldTypeCode.FILE]: '附件',
  [PortfolioDevelopmentRecordEntryFieldTypeCode.STATUS]: '状态',
}
