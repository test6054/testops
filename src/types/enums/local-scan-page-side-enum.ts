/** 本地扫描 Agent 页正反面，与 scanner-agent-local 协议逐值一致 */
export enum LocalScanPageSideCode {
  FRONT = 'FRONT',
  BACK = 'BACK',
}

export const ALL_LOCAL_SCAN_PAGE_SIDE_CODES: readonly LocalScanPageSideCode[] = [
  LocalScanPageSideCode.FRONT,
  LocalScanPageSideCode.BACK,
]
