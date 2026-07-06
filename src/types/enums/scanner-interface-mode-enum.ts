/** ScannerInterfaceMode */
export enum ScannerInterfaceModeCode {
  HTTP_PUSH = 'HTTP_PUSH',
}

export const ALL_SCANNER_INTERFACE_MODE_CODES: readonly ScannerInterfaceModeCode[] = [
  ScannerInterfaceModeCode.HTTP_PUSH,
]

export const ScannerInterfaceModeDescription: Record<ScannerInterfaceModeCode, string> = {
  [ScannerInterfaceModeCode.HTTP_PUSH]: '一体机 Agent',
}

