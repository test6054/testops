/** 一体机扫描阻断原因码 */
export enum ScannerKioskBlockReasonCode {
  E_KOS_004 = 'E_KOS_004',
}

export const ALL_SCANNER_KIOSK_BLOCK_REASON_CODES: readonly ScannerKioskBlockReasonCode[] = [
  ScannerKioskBlockReasonCode.E_KOS_004,
]

export const ScannerKioskBlockReasonDescription: Record<ScannerKioskBlockReasonCode, string> = {
  [ScannerKioskBlockReasonCode.E_KOS_004]: '答题卡模式缺少制卷 layout',
}
