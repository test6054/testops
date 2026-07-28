export enum PortfolioDevelopmentRecordEvidenceStatusCode {
  COMPLETE = 'COMPLETE',
  INCOMPLETE = 'INCOMPLETE',
}

export const ALL_PORTFOLIO_DEVELOPMENT_RECORD_EVIDENCE_STATUS_CODES:
  readonly PortfolioDevelopmentRecordEvidenceStatusCode[] = [
    PortfolioDevelopmentRecordEvidenceStatusCode.COMPLETE,
    PortfolioDevelopmentRecordEvidenceStatusCode.INCOMPLETE,
  ]

export const PortfolioDevelopmentRecordEvidenceStatusDescription: Record<
  PortfolioDevelopmentRecordEvidenceStatusCode,
  string
> = {
  [PortfolioDevelopmentRecordEvidenceStatusCode.COMPLETE]: '证据齐全',
  [PortfolioDevelopmentRecordEvidenceStatusCode.INCOMPLETE]: '证据不齐',
}
