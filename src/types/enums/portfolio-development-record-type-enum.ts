/** 发展档案条目类型 */
export enum PortfolioDevelopmentRecordTypeCode {
  ACHIEVEMENT = 'ACHIEVEMENT',
  HONOR = 'HONOR',
  POLICY = 'POLICY',
}

export const ALL_PORTFOLIO_DEVELOPMENT_RECORD_TYPE_CODES: readonly PortfolioDevelopmentRecordTypeCode[] = [
  PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
  PortfolioDevelopmentRecordTypeCode.HONOR,
  PortfolioDevelopmentRecordTypeCode.POLICY,
]

export const PortfolioDevelopmentRecordTypeDescription: Record<PortfolioDevelopmentRecordTypeCode, string> = {
  [PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT]: '成果库',
  [PortfolioDevelopmentRecordTypeCode.HONOR]: '荣誉库',
  [PortfolioDevelopmentRecordTypeCode.POLICY]: '政策文件库',
}
