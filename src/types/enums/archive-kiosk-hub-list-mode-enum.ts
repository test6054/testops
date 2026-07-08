/** EXAM_ARCHIVE 工位 Hub 列表策略 */
export enum ArchiveKioskHubListModeCode {
  DISPATCH_QUEUE_FIRST = 'DISPATCH_QUEUE_FIRST',
  ARCHIVE_PICK_FIRST = 'ARCHIVE_PICK_FIRST',
}

export const ALL_ARCHIVE_KIOSK_HUB_LIST_MODE_CODES: readonly ArchiveKioskHubListModeCode[] = [
  ArchiveKioskHubListModeCode.DISPATCH_QUEUE_FIRST,
  ArchiveKioskHubListModeCode.ARCHIVE_PICK_FIRST,
]

export const ArchiveKioskHubListModeDescription: Record<ArchiveKioskHubListModeCode, string> = {
  [ArchiveKioskHubListModeCode.DISPATCH_QUEUE_FIRST]: '派单队列优先',
  [ArchiveKioskHubListModeCode.ARCHIVE_PICK_FIRST]: '临时选卷优先',
}
