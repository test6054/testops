/** ScannerDriverType */
export enum ScannerDriverTypeCode {
  TWAIN = 'TWAIN',
  WIA = 'WIA',
}

export const ALL_SCANNER_DRIVER_TYPE_CODES: readonly ScannerDriverTypeCode[] = [
  ScannerDriverTypeCode.TWAIN,
  ScannerDriverTypeCode.WIA,
]

export const ScannerDriverTypeDescription: Record<ScannerDriverTypeCode, string> = {
  [ScannerDriverTypeCode.TWAIN]: 'TWAIN 驱动',
  [ScannerDriverTypeCode.WIA]: 'WIA 驱动',
}
