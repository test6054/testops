/** 政策文件状态 - PortfolioPolicyDocumentStatusEnum */
export enum PortfolioPolicyDocumentStatusCode {
  DRAFT = 'DRAFT',
  PENDING_PUBLISH = 'PENDING_PUBLISH',
  EFFECTIVE = 'EFFECTIVE',
  SUPERSEDED = 'SUPERSEDED',
  ABOLISHED = 'ABOLISHED',
}

export const ALL_PORTFOLIO_POLICY_DOCUMENT_STATUS_CODES: readonly PortfolioPolicyDocumentStatusCode[] = [
  PortfolioPolicyDocumentStatusCode.DRAFT,
  PortfolioPolicyDocumentStatusCode.PENDING_PUBLISH,
  PortfolioPolicyDocumentStatusCode.EFFECTIVE,
  PortfolioPolicyDocumentStatusCode.SUPERSEDED,
  PortfolioPolicyDocumentStatusCode.ABOLISHED,
]

export const PortfolioPolicyDocumentStatusDescription: Record<PortfolioPolicyDocumentStatusCode, string> = {
  [PortfolioPolicyDocumentStatusCode.DRAFT]: '草稿',
  [PortfolioPolicyDocumentStatusCode.PENDING_PUBLISH]: '待发布',
  [PortfolioPolicyDocumentStatusCode.EFFECTIVE]: '现行有效',
  [PortfolioPolicyDocumentStatusCode.SUPERSEDED]: '已被替代',
  [PortfolioPolicyDocumentStatusCode.ABOLISHED]: '已废止',
}
