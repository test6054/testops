/** ScannerDeviceStatus */
export enum ScannerDeviceStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISABLED = 'DISABLED',
}

export const ALL_SCANNER_DEVICE_STATUS_CODES: readonly ScannerDeviceStatusCode[] = [
  ScannerDeviceStatusCode.ACTIVE,
  ScannerDeviceStatusCode.INACTIVE,
  ScannerDeviceStatusCode.DISABLED,
]

export const ScannerDeviceStatusDescription: Record<ScannerDeviceStatusCode, string> = {
  [ScannerDeviceStatusCode.ACTIVE]: '启用',
  [ScannerDeviceStatusCode.INACTIVE]: '停用',
  [ScannerDeviceStatusCode.DISABLED]: '禁用',
}
