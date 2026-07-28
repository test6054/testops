/** 考后归档包时间线步骤状态 - 与后端 ArchiveVolumeExamArchivePackageTimelineStepStatus 逐值对齐 */
export enum ArchiveVolumeExamArchivePackageTimelineStepStatusCode {
  DONE = 'DONE',
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export const ALL_ARCHIVE_VOLUME_EXAM_ARCHIVE_PACKAGE_TIMELINE_STEP_STATUS_CODES:
  readonly ArchiveVolumeExamArchivePackageTimelineStepStatusCode[] = [
    ArchiveVolumeExamArchivePackageTimelineStepStatusCode.DONE,
    ArchiveVolumeExamArchivePackageTimelineStepStatusCode.ACTIVE,
    ArchiveVolumeExamArchivePackageTimelineStepStatusCode.PENDING,
    ArchiveVolumeExamArchivePackageTimelineStepStatusCode.FAILED,
  ]
