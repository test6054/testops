/** 重复卷处理状态 */
export enum DuplicateResolutionStatusCode {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}

export const ALL_DUPLICATE_RESOLUTION_STATUS_CODES: readonly DuplicateResolutionStatusCode[] = [
  DuplicateResolutionStatusCode.PENDING,
  DuplicateResolutionStatusCode.RESOLVED,
]

export const DuplicateResolutionStatusDescription: Record<DuplicateResolutionStatusCode, string> = {
  [DuplicateResolutionStatusCode.PENDING]: '待处置',
  [DuplicateResolutionStatusCode.RESOLVED]: '已处置',
}

