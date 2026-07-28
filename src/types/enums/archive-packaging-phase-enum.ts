/** ArchivePackagingPhase */
export enum ArchivePackagingPhaseCode {
  QUEUED = 'QUEUED',
  AGGREGATING = 'AGGREGATING',
  WRITING_ZIP = 'WRITING_ZIP',
  UPLOADING_PARTS = 'UPLOADING_PARTS',
  FINALIZING = 'FINALIZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_ARCHIVE_PACKAGING_PHASE_CODES: readonly ArchivePackagingPhaseCode[] = [
  ArchivePackagingPhaseCode.QUEUED,
  ArchivePackagingPhaseCode.AGGREGATING,
  ArchivePackagingPhaseCode.WRITING_ZIP,
  ArchivePackagingPhaseCode.UPLOADING_PARTS,
  ArchivePackagingPhaseCode.FINALIZING,
  ArchivePackagingPhaseCode.COMPLETED,
  ArchivePackagingPhaseCode.FAILED,
]

export const ArchivePackagingPhaseDescription: Record<ArchivePackagingPhaseCode, string> = {
  [ArchivePackagingPhaseCode.QUEUED]: '已入队',
  [ArchivePackagingPhaseCode.AGGREGATING]: '聚合归档物料',
  [ArchivePackagingPhaseCode.WRITING_ZIP]: '生成 ZIP',
  [ArchivePackagingPhaseCode.UPLOADING_PARTS]: '分片上传',
  [ArchivePackagingPhaseCode.FINALIZING]: '收尾落地',
  [ArchivePackagingPhaseCode.COMPLETED]: '完成',
  [ArchivePackagingPhaseCode.FAILED]: '失败',
}
