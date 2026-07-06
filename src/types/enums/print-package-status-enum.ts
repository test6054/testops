/** PrintPackageStatus */
export enum PrintPackageStatusCode {
  GENERATED = 'GENERATED',
}

export const ALL_PRINT_PACKAGE_STATUS_CODES: readonly PrintPackageStatusCode[] = [
  PrintPackageStatusCode.GENERATED,
]

export const PrintPackageStatusDescription: Record<PrintPackageStatusCode, string> = {
  [PrintPackageStatusCode.GENERATED]: '已生成',
}

