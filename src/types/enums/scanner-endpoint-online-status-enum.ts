/** ScannerEndpointOnlineStatus */
export enum ScannerEndpointOnlineStatusCode {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export const ALL_SCANNER_ENDPOINT_ONLINE_STATUS_CODES: readonly ScannerEndpointOnlineStatusCode[] = [
  ScannerEndpointOnlineStatusCode.ONLINE,
  ScannerEndpointOnlineStatusCode.OFFLINE,
]

export const ScannerEndpointOnlineStatusDescription: Record<ScannerEndpointOnlineStatusCode, string> = {
  [ScannerEndpointOnlineStatusCode.ONLINE]: '在线',
  [ScannerEndpointOnlineStatusCode.OFFLINE]: '离线',
}

