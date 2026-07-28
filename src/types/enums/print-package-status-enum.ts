/** PrintPackageStatus */
export enum PrintPackageStatusCode {
  GENERATED = 'GENERATED',
  RELEASED_TO_PRINTER = 'RELEASED_TO_PRINTER',
  PRINTED = 'PRINTED',
  SEALED = 'SEALED',
  ISSUED_TO_EXAM_SITE = 'ISSUED_TO_EXAM_SITE',
  RECONCILED = 'RECONCILED',
  VOIDED = 'VOIDED',
}

export const ALL_PRINT_PACKAGE_STATUS_CODES: readonly PrintPackageStatusCode[] = [
  PrintPackageStatusCode.GENERATED,
  PrintPackageStatusCode.RELEASED_TO_PRINTER,
  PrintPackageStatusCode.PRINTED,
  PrintPackageStatusCode.SEALED,
  PrintPackageStatusCode.ISSUED_TO_EXAM_SITE,
  PrintPackageStatusCode.RECONCILED,
  PrintPackageStatusCode.VOIDED,
]

export const PrintPackageStatusDescription: Record<PrintPackageStatusCode, string> = {
  [PrintPackageStatusCode.GENERATED]: '已生成',
  [PrintPackageStatusCode.RELEASED_TO_PRINTER]: '已送印',
  [PrintPackageStatusCode.PRINTED]: '已印毕',
  [PrintPackageStatusCode.SEALED]: '已密封',
  [PrintPackageStatusCode.ISSUED_TO_EXAM_SITE]: '已交接考点',
  [PrintPackageStatusCode.RECONCILED]: '已核销',
  [PrintPackageStatusCode.VOIDED]: '已作废',
}
