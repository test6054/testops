/** 外部拔取结果确认状态 - ExternalPullConfirmationStatusEnum */
export enum ExternalPullConfirmationStatusCode {
  PREVIEW = 'PREVIEW',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export const ALL_EXTERNAL_PULL_CONFIRMATION_STATUS_CODES: readonly ExternalPullConfirmationStatusCode[] = [
  ExternalPullConfirmationStatusCode.PREVIEW,
  ExternalPullConfirmationStatusCode.CONFIRMED,
  ExternalPullConfirmationStatusCode.REJECTED,
]

export const ExternalPullConfirmationStatusDescription: Record<ExternalPullConfirmationStatusCode, string> = {
  [ExternalPullConfirmationStatusCode.PREVIEW]: '预览中',
  [ExternalPullConfirmationStatusCode.CONFIRMED]: '已确认',
  [ExternalPullConfirmationStatusCode.REJECTED]: '已驳回',
}
