/** LedgerStatus */
export enum LedgerStatusCode {
  BALANCING = 'BALANCING',
  BALANCED = 'BALANCED',
  INCIDENT_OPEN = 'INCIDENT_OPEN',
}

export const ALL_LEDGER_STATUS_CODES: readonly LedgerStatusCode[] = [
  LedgerStatusCode.BALANCING,
  LedgerStatusCode.BALANCED,
  LedgerStatusCode.INCIDENT_OPEN,
]

export const LedgerStatusDescription: Record<LedgerStatusCode, string> = {
  [LedgerStatusCode.BALANCING]: '对账中',
  [LedgerStatusCode.BALANCED]: '已平账',
  [LedgerStatusCode.INCIDENT_OPEN]: '存在异常',
}

