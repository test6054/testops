/** 扫描一体机扫描模式 */
export enum ScannerKioskScanModeCode {
  DIRECT = 'DIRECT',
  SUPPLEMENT = 'SUPPLEMENT',
}

export const ALL_SCANNER_KIOSK_SCAN_MODE_CODES: readonly ScannerKioskScanModeCode[] = [
  ScannerKioskScanModeCode.DIRECT,
  ScannerKioskScanModeCode.SUPPLEMENT,
]

export const ScannerKioskScanModeDescription: Record<ScannerKioskScanModeCode, string> = {
  [ScannerKioskScanModeCode.DIRECT]: '直扫',
  [ScannerKioskScanModeCode.SUPPLEMENT]: '补扫',
}
