/** 归档卷导航链节点状态 */
export enum ArchiveVolumeNavigationChainStatusCode {
  DONE = 'done',
  CURRENT = 'current',
  PENDING = 'pending',
  WARN = 'warn',
}

export const ALL_ARCHIVE_VOLUME_NAVIGATION_CHAIN_STATUS_CODES: readonly ArchiveVolumeNavigationChainStatusCode[] = [
  ArchiveVolumeNavigationChainStatusCode.DONE,
  ArchiveVolumeNavigationChainStatusCode.CURRENT,
  ArchiveVolumeNavigationChainStatusCode.PENDING,
  ArchiveVolumeNavigationChainStatusCode.WARN,
]

