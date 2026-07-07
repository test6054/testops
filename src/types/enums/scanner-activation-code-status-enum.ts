/** 扫描 Agent 激活码状态 */
export enum ScannerActivationCodeStatusCode {
  UNUSED = 'UNUSED',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

export const ALL_SCANNER_ACTIVATION_CODE_STATUS_CODES: readonly ScannerActivationCodeStatusCode[] = [
  ScannerActivationCodeStatusCode.UNUSED,
  ScannerActivationCodeStatusCode.USED,
  ScannerActivationCodeStatusCode.EXPIRED,
]

export const ScannerActivationCodeStatusDescription: Record<ScannerActivationCodeStatusCode, string> = {
  [ScannerActivationCodeStatusCode.UNUSED]: '未使用',
  [ScannerActivationCodeStatusCode.USED]: '已使用',
  [ScannerActivationCodeStatusCode.EXPIRED]: '已过期',
}

