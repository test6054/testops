/** 印刷包明细状态 */
export enum PrintPackageItemStatusCode {
  READY = 'READY',
}

export const ALL_PRINT_PACKAGE_ITEM_STATUS_CODES: readonly PrintPackageItemStatusCode[] = [
  PrintPackageItemStatusCode.READY,
]

export const PrintPackageItemStatusDescription: Record<PrintPackageItemStatusCode, string> = {
  [PrintPackageItemStatusCode.READY]: '待印刷',
}
