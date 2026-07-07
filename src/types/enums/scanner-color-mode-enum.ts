/** ScannerColorMode */
export enum ScannerColorModeCode {
  COLOR = 'COLOR',
  GRAY = 'GRAY',
  LINEART = 'LINEART',
}

export const ALL_SCANNER_COLOR_MODE_CODES: readonly ScannerColorModeCode[] = [
  ScannerColorModeCode.COLOR,
  ScannerColorModeCode.GRAY,
  ScannerColorModeCode.LINEART,
]

export const ScannerColorModeDescription: Record<ScannerColorModeCode, string> = {
  [ScannerColorModeCode.COLOR]: '彩色',
  [ScannerColorModeCode.GRAY]: '灰度',
  [ScannerColorModeCode.LINEART]: '黑白',
}
