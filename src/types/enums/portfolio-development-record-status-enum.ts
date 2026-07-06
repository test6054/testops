/** 发展档案条目状态 */
export enum PortfolioDevelopmentRecordStatusCode {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
}

export const ALL_PORTFOLIO_DEVELOPMENT_RECORD_STATUS_CODES: readonly PortfolioDevelopmentRecordStatusCode[] = [
  PortfolioDevelopmentRecordStatusCode.DRAFT,
  PortfolioDevelopmentRecordStatusCode.ACTIVE,
]

export const PortfolioDevelopmentRecordStatusDescription: Record<PortfolioDevelopmentRecordStatusCode, string> = {
  [PortfolioDevelopmentRecordStatusCode.DRAFT]: '草稿',
  [PortfolioDevelopmentRecordStatusCode.ACTIVE]: '有效',
}
