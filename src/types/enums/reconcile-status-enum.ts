/** ReconcileStatus */
export enum ReconcileStatusCode {
  MATCHED = 'MATCHED',
  MISMATCHED = 'MISMATCHED',
  PENDING_RECONCILE = 'PENDING_RECONCILE',
}

export const ALL_RECONCILE_STATUS_CODES: readonly ReconcileStatusCode[] = [
  ReconcileStatusCode.MATCHED,
  ReconcileStatusCode.MISMATCHED,
  ReconcileStatusCode.PENDING_RECONCILE,
]

export const ReconcileStatusDescription: Record<ReconcileStatusCode, string> = {
  [ReconcileStatusCode.MATCHED]: '一致',
  [ReconcileStatusCode.MISMATCHED]: '不一致',
  [ReconcileStatusCode.PENDING_RECONCILE]: '待对账',
}

