/** 考后归档包状态 */
export enum ArchivePackageStatusCode {
  DRAFT = 'DRAFT',
  PACKAGING = 'PACKAGING',
  PACKAGING_FAILED = 'PACKAGING_FAILED',
  STORED = 'STORED',
  ACTIVE = 'ACTIVE',
  APPRAISAL_PENDING = 'APPRAISAL_PENDING',
  APPRAISAL_DECIDED = 'APPRAISAL_DECIDED',
  DESTRUCTION_PENDING = 'DESTRUCTION_PENDING',
  DESTRUCTION_APPROVED = 'DESTRUCTION_APPROVED',
  DESTRUCTION_EXECUTING = 'DESTRUCTION_EXECUTING',
  DESTRUCTION_FAILED = 'DESTRUCTION_FAILED',
  DESTROYED = 'DESTROYED',
}

export const ALL_ARCHIVE_PACKAGE_STATUS_CODES: readonly ArchivePackageStatusCode[] = [
  ArchivePackageStatusCode.DRAFT,
  ArchivePackageStatusCode.PACKAGING,
  ArchivePackageStatusCode.PACKAGING_FAILED,
  ArchivePackageStatusCode.STORED,
  ArchivePackageStatusCode.ACTIVE,
  ArchivePackageStatusCode.APPRAISAL_PENDING,
  ArchivePackageStatusCode.APPRAISAL_DECIDED,
  ArchivePackageStatusCode.DESTRUCTION_PENDING,
  ArchivePackageStatusCode.DESTRUCTION_APPROVED,
  ArchivePackageStatusCode.DESTRUCTION_EXECUTING,
  ArchivePackageStatusCode.DESTRUCTION_FAILED,
  ArchivePackageStatusCode.DESTROYED,
]

export const ArchivePackageStatusDescription: Record<ArchivePackageStatusCode, string> = {
  [ArchivePackageStatusCode.DRAFT]: '草稿',
  [ArchivePackageStatusCode.PACKAGING]: '打包中',
  [ArchivePackageStatusCode.PACKAGING_FAILED]: '打包失败',
  [ArchivePackageStatusCode.STORED]: '已投递存储',
  [ArchivePackageStatusCode.ACTIVE]: '保管中',
  [ArchivePackageStatusCode.APPRAISAL_PENDING]: '鉴定待办',
  [ArchivePackageStatusCode.APPRAISAL_DECIDED]: '鉴定完成',
  [ArchivePackageStatusCode.DESTRUCTION_PENDING]: '销毁待审批',
  [ArchivePackageStatusCode.DESTRUCTION_APPROVED]: '销毁已批准',
  [ArchivePackageStatusCode.DESTRUCTION_EXECUTING]: '销毁执行中',
  [ArchivePackageStatusCode.DESTRUCTION_FAILED]: '销毁执行失败',
  [ArchivePackageStatusCode.DESTROYED]: '已销毁',
}
