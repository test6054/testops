/** 外部授课证据类型 - PortfolioExternalTeachingEvidenceCodeEnum */
export enum PortfolioExternalTeachingEvidenceCode {
  EXTERNAL_TEACHING = 'EXTERNAL_TEACHING',
}

export const ALL_PORTFOLIO_EXTERNAL_TEACHING_EVIDENCE_CODES: readonly PortfolioExternalTeachingEvidenceCode[] = [
  PortfolioExternalTeachingEvidenceCode.EXTERNAL_TEACHING,
]

export const PortfolioExternalTeachingEvidenceDescription: Record<PortfolioExternalTeachingEvidenceCode, string> = {
  [PortfolioExternalTeachingEvidenceCode.EXTERNAL_TEACHING]: '外部/产业导师授课证据',
}
