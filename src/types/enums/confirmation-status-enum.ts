/** 通用配置 / 数据确认状态 - ConfirmationStatusEnum */
export enum ConfirmationStatusCode {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  RETURNED = 'RETURNED',
}

export const ALL_CONFIRMATION_STATUS_CODES: readonly ConfirmationStatusCode[] = [
  ConfirmationStatusCode.DRAFT,
  ConfirmationStatusCode.SUBMITTED,
  ConfirmationStatusCode.CONFIRMED,
  ConfirmationStatusCode.RETURNED,
]

export const ConfirmationStatusDescription: Record<ConfirmationStatusCode, string> = {
  [ConfirmationStatusCode.DRAFT]: '起草',
  [ConfirmationStatusCode.SUBMITTED]: '已提交',
  [ConfirmationStatusCode.CONFIRMED]: '已确认',
  [ConfirmationStatusCode.RETURNED]: '已退回',
}
