/** ScannerDuplexMode */
export enum ScannerDuplexModeCode {
  SIMPLEX = 'SIMPLEX',
  DUPLEX = 'DUPLEX',
}

export const ALL_SCANNER_DUPLEX_MODE_CODES: readonly ScannerDuplexModeCode[] = [
  ScannerDuplexModeCode.SIMPLEX,
  ScannerDuplexModeCode.DUPLEX,
]

export const ScannerDuplexModeDescription: Record<ScannerDuplexModeCode, string> = {
  [ScannerDuplexModeCode.SIMPLEX]: '单面扫描',
  [ScannerDuplexModeCode.DUPLEX]: '双面扫描',
}
